import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { WhatsAppService } from 'src/modules/whatsapp/whatsapp.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { WhatsAppHttpClient } from 'src/modules/whatsapp/whatsapp.http';
import { ConfigService } from '@nestjs/config';
import {
  createTestPrisma,
  cleanupTest,
  seedWhatsAppContact,
  seedWhatsAppConversation,
} from '../setup/test-helpers';

describe('WhatsAppService (integration)', () => {
  let module: TestingModule;
  let service: WhatsAppService;
  let prisma: PrismaClient;
  const whatsAppContactIds: string[] = [];
  const whatsAppConversationIds: string[] = [];
  const whatsAppMessageIds: string[] = [];

  beforeAll(async () => {
    prisma = createTestPrisma();

    module = await Test.createTestingModule({
      providers: [
        WhatsAppService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: WhatsAppHttpClient,
          useValue: {
            markAsRead: jest.fn().mockResolvedValue({}),
            sendTextMessage: jest
              .fn()
              .mockResolvedValue({ messageId: 'wamid.test-out-int' }),
            sendTemplateMessage: jest
              .fn()
              .mockResolvedValue({ messageId: 'wamid.test-tpl-int' }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('123456789'),
          },
        },
      ],
    }).compile();

    service = module.get<WhatsAppService>(WhatsAppService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await module.close();
  });

  afterEach(async () => {
    await cleanupTest(prisma, {
      whatsAppContactIds,
      whatsAppConversationIds,
      whatsAppMessageIds,
    });
    whatsAppContactIds.length = 0;
    whatsAppConversationIds.length = 0;
    whatsAppMessageIds.length = 0;
  });

  describe('handleIncomingMessage and message persistence', () => {
    it('should create new WAContact, WAConversation, and WAMessage row when receiving incoming webhook payload', async () => {
      const phone = `+88017${Math.floor(10000000 + Math.random() * 90000000)}`;
      const wamid = `wamid.HBgL${Date.now()}`;

      const payload = {
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    {
                      id: wamid,
                      from: phone,
                      type: 'text',
                      text: { body: 'Hello integration test' },
                    },
                  ],
                  contacts: [
                    {
                      profile: { name: 'Meta Integration' },
                      wa_id: phone,
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      await service.handleIncomingMessage(payload);

      // Check DB directly
      const contact = await prisma.whatsAppContact.findUnique({
        where: { phone },
      });
      expect(contact).toBeDefined();
      whatsAppContactIds.push(contact!.id);

      const convs = await prisma.whatsAppConversation.findMany({
        where: { contactId: contact?.id },
      });
      expect(convs).toHaveLength(1);
      whatsAppConversationIds.push(convs[0].id);

      const messages = await prisma.whatsAppMessage.findMany({
        where: { conversationId: convs[0].id },
      });
      expect(messages).toHaveLength(1);
      expect(messages[0].body).toBe('Hello integration test');
      whatsAppMessageIds.push(messages[0].id);
    });
  });

  describe('sendReply and sendTemplateMessage', () => {
    it('should persist reply message to DB under the correct conversationId', async () => {
      const contact = await seedWhatsAppContact(prisma);
      whatsAppContactIds.push(contact.id);

      const conv = await seedWhatsAppConversation(prisma, contact.id);
      whatsAppConversationIds.push(conv.id);

      const replyResult = await service.sendReply(conv.id, 'Outbound response');
      expect(replyResult.success).toBe(true);

      const messages = await prisma.whatsAppMessage.findMany({
        where: { conversationId: conv.id },
      });
      expect(messages).toHaveLength(1);
      expect(messages[0].body).toBe('Outbound response');
      expect(messages[0].direction).toBe('OUTBOUND');
      whatsAppMessageIds.push(messages[0].id);
    });

    it('should persist template message to DB and link it to contact conversations', async () => {
      const phone = `+88017${Math.floor(10000000 + Math.random() * 90000000)}`;
      const result = await service.sendTemplateMessage(
        phone,
        'hello_world',
        'en_US',
      );
      expect(result.success).toBe(true);

      const contact = await prisma.whatsAppContact.findUnique({
        where: { phone },
      });
      expect(contact).toBeDefined();
      whatsAppContactIds.push(contact!.id);

      const convs = await prisma.whatsAppConversation.findMany({
        where: { contactId: contact?.id },
      });
      expect(convs).toHaveLength(1);
      whatsAppConversationIds.push(convs[0].id);

      const messages = await prisma.whatsAppMessage.findMany({
        where: { conversationId: convs[0].id },
      });
      expect(messages).toHaveLength(1);
      expect(messages[0].type).toBe('template');
      whatsAppMessageIds.push(messages[0].id);
    });
  });
});
