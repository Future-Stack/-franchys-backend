import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2EApp } from '../helpers/app.helper';
import {
  registerAndLogin,
  cleanupUser,
  AuthTokens,
} from '../helpers/auth.helper';
import { createTestPrisma } from '../setup/test-helpers';
import { WhatsAppHttpClient } from 'src/modules/whatsapp/whatsapp.http';

describe('WhatsApp Tracker (e2e)', () => {
  let app: INestApplication;
  let tokens: AuthTokens;
  let seededConversationId: string;
  let seededMessageId: string;
  const whatsAppContactIds: string[] = [];
  const whatsAppConversationIds: string[] = [];
  const whatsAppMessageIds: string[] = [];

  beforeAll(async () => {
    // Set environment variables for config module mapping
    process.env.WHATSAPP_VERIFY_TOKEN = 'my_secure_verify_token';
    process.env.WHATSAPP_PHONE_NUMBER_ID = '123456789';

    // Override the WhatsApp HTTP client to prevent E2E requests from failing with actual Meta Graph API calls
    app = await createE2EApp((builder) => {
      builder.overrideProvider(WhatsAppHttpClient).useValue({
        markAsRead: jest.fn().mockResolvedValue({}),
        sendTextMessage: jest.fn().mockImplementation(() =>
          Promise.resolve({
            messageId: `wamid.e2e-reply-${Math.random()}-${Date.now()}`,
          }),
        ),
        sendTemplateMessage: jest.fn().mockImplementation(() =>
          Promise.resolve({
            messageId: `wamid.e2e-template-${Math.random()}-${Date.now()}`,
          }),
        ),
      });
    });

    tokens = await registerAndLogin(app);

    const prisma = createTestPrisma();
    // Seed some test data in DB
    const contact = await prisma.whatsAppContact.create({
      data: { phone: `+88017${Date.now()}`, name: 'E2E John' },
    });
    whatsAppContactIds.push(contact.id);

    const conv = await prisma.whatsAppConversation.create({
      data: { contactId: contact.id },
    });
    seededConversationId = conv.id;
    whatsAppConversationIds.push(conv.id);

    const msg = await prisma.whatsAppMessage.create({
      data: {
        conversationId: conv.id,
        direction: 'INBOUND',
        from: contact.phone,
        to: '123456789',
        body: 'E2E WhatsApp Content',
        messageId: `wamid.e2e-msg-${Date.now()}`,
      },
    });
    seededMessageId = msg.id;
    whatsAppMessageIds.push(msg.id);

    await prisma.$disconnect();
  });

  afterAll(async () => {
    const prisma = createTestPrisma();

    // Wipe all messages, conversations, and contacts matching test ranges
    await prisma.whatsAppMessage.deleteMany({
      where: {
        OR: [
          { id: { in: whatsAppMessageIds } },
          { from: { startsWith: '+88017' } },
          { to: { startsWith: '+88017' } },
          { from: '123456789' },
          { to: '123456789' },
        ],
      },
    });
    await prisma.whatsAppConversation.deleteMany({
      where: {
        OR: [
          { id: { in: whatsAppConversationIds } },
          { contact: { phone: { startsWith: '+88017' } } },
        ],
      },
    });
    await prisma.whatsAppContact.deleteMany({
      where: {
        OR: [
          { id: { in: whatsAppContactIds } },
          { phone: { startsWith: '+88017' } },
        ],
      },
    });

    await prisma.$disconnect();

    await cleanupUser(tokens.email);
    await app.close();
  });

  // ─── GET /whatsapp/webhook ───────────────────────────────────────────────

  describe('GET /api/v1/whatsapp/webhook', () => {
    it('should verify Meta subscription challenge using public endpoint', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/whatsapp/webhook')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': 'my_secure_verify_token',
          'hub.challenge': 'MY_CHALLENGE_CODE',
        })
        .expect(200);

      expect(res.text).toBe('MY_CHALLENGE_CODE');
    });

    it('should return 403 Forbidden on token mismatch', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/whatsapp/webhook')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': 'wrong_token',
          'hub.challenge': 'CHALLENGE',
        })
        .expect(403);
    });
  });

  // ─── POST /whatsapp/webhook ──────────────────────────────────────────────

  describe('POST /api/v1/whatsapp/webhook', () => {
    it('should accept incoming Pub/Sub Meta webhooks without authentication (Public)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/whatsapp/webhook')
        .send({
          entry: [
            {
              changes: [
                {
                  value: {
                    messages: [
                      {
                        id: `wamid.webhook-post-${Date.now()}`,
                        from: '+8801799999999',
                        type: 'text',
                        text: { body: 'Incoming webhook msg' },
                      },
                    ],
                  },
                },
              ],
            },
          ],
        })
        .expect(200);

      expect(res.text).toBe('EVENT_RECEIVED');
    });
  });

  // ─── GET /whatsapp/conversations ─────────────────────────────────────────

  describe('GET /api/v1/whatsapp/conversations', () => {
    it('should retrieve all WhatsApp conversations and wrap in data envelope', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/whatsapp/conversations')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ─── GET /whatsapp/conversations/:id/messages ─────────────────────────────

  describe('GET /api/v1/whatsapp/conversations/:id/messages', () => {
    it('should retrieve messages for specified conversation ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/whatsapp/conversations/${seededConversationId}/messages`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0].id).toBe(seededMessageId);
    });
  });

  // ─── POST /whatsapp/conversations/:id/reply ───────────────────────────────

  describe('POST /api/v1/whatsapp/conversations/:id/reply', () => {
    it('should reply to existing conversation successfully', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/whatsapp/conversations/${seededConversationId}/reply`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({ text: 'E2E WhatsApp Reply' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.success).toBe(true);
    });

    it('should return 400 Bad Request on empty reply', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/whatsapp/conversations/${seededConversationId}/reply`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({ text: '' })
        .expect(400);
    });
  });

  // ─── POST /whatsapp/send-template ─────────────────────────────────────────

  describe('POST /api/v1/whatsapp/send-template', () => {
    it('should send template notification successfully', async () => {
      const phone = `+88017${Math.floor(10000000 + Math.random() * 90000000)}`;
      const res = await request(app.getHttpServer())
        .post('/api/v1/whatsapp/send-template')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          to: phone,
          templateName: 'welcome_template',
          languageCode: 'en_US',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.success).toBe(true);
    });
  });
});
