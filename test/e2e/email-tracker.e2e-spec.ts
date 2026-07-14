import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2EApp } from '../helpers/app.helper';
import {
  registerAndLogin,
  cleanupUser,
  AuthTokens,
} from '../helpers/auth.helper';
import { createTestPrisma } from '../setup/test-helpers';

jest.mock('googleapis', () => {
  const mockWatch = jest.fn();
  const mockGetProfile = jest.fn();
  const mockMessagesList = jest.fn();
  const mockMessagesGet = jest.fn();
  const mockMessagesSend = jest.fn();

  return {
    google: {
      auth: {
        OAuth2: jest.fn().mockImplementation(() => ({
          setCredentials: jest.fn(),
        })),
      },
      gmail: jest.fn().mockImplementation(() => ({
        users: {
          watch: mockWatch,
          getProfile: mockGetProfile,
          messages: {
            list: mockMessagesList,
            get: mockMessagesGet,
            send: mockMessagesSend,
          },
        },
      })),
    },
  };
});

describe('Email Tracker (e2e)', () => {
  let app: INestApplication;
  let tokens: AuthTokens;
  let seededContactId: string;
  let seededThreadId: string;
  let seededMessageId: string;

  beforeAll(async () => {
    app = await createE2EApp();
    tokens = await registerAndLogin(app);

    const prisma = createTestPrisma();
    // Seed some test threads/messages in DB to query
    const contact = await prisma.contact.create({
      data: { email: `e2e-client-${Date.now()}@tracker.com` },
    });
    seededContactId = contact.id;

    const thread = await prisma.thread.create({
      data: { subject: 'E2E Subject', contactId: contact.id },
    });
    seededThreadId = thread.id;

    const msg = await prisma.message.create({
      data: {
        threadId: thread.id,
        direction: 'INBOUND',
        from: contact.email,
        to: 'my-shop@shop.com',
        body: 'E2E Body content',
        messageId: `<msg-id-e2e-${Date.now()}>`,
      },
    });
    seededMessageId = msg.id;

    await prisma.$disconnect();
  });

  afterAll(async () => {
    const prisma = createTestPrisma();
    await prisma.message.deleteMany({ where: { id: seededMessageId } });
    await prisma.thread.deleteMany({ where: { id: seededThreadId } });
    await prisma.contact.deleteMany({ where: { id: seededContactId } });
    await prisma.$disconnect();

    await cleanupUser(tokens.email);
    await app.close();
  });

  // ─── GET /emails/threads ──────────────────────────────────────────────────

  describe('GET /api/v1/emails/threads', () => {
    it('should retrieve all email threads and wrap in data envelope', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/emails/threads')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return 401 Unauthorized on missing token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/emails/threads')
        .expect(401);
    });
  });

  // ─── GET /emails/threads/:id/messages ──────────────────────────────────────

  describe('GET /api/v1/emails/threads/:id/messages', () => {
    it('should retrieve all messages for specified thread ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/emails/threads/${seededThreadId}/messages`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0].id).toBe(seededMessageId);
    });
  });

  // ─── POST /emails/threads/:id/reply ────────────────────────────────────────

  describe('POST /api/v1/emails/threads/:id/reply', () => {
    it('should submit reply successfully and return 201 Created', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/emails/threads/${seededThreadId}/reply`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({ text: 'E2E Response text' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toBe('Reply sent successfully');
    });

    it('should return 400 Bad Request on empty reply body', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/emails/threads/${seededThreadId}/reply`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({ text: '' })
        .expect(400);
    });
  });

  // ─── POST /emails/webhook ──────────────────────────────────────────────────

  describe('POST /api/v1/emails/webhook', () => {
    it('should accept incoming Pub/Sub webhooks without authentication (Public)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/emails/webhook')
        .send({ message: { data: 'test-webhook-payload' } })
        .expect(200);

      expect(res.text).toBe('OK');
    });
  });
});
