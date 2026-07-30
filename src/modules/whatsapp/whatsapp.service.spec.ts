import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WhatsAppService } from './whatsapp.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsAppHttpClient } from './whatsapp.http';

const mockPrisma = {
  whatsAppMessage: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
  },
  whatsAppContact: {
    findUnique: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
  },
  whatsAppConversation: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
};

const mockWhatsAppHttpClient = {
  markAsRead: jest.fn(),
  sendTextMessage: jest.fn(),
  sendTemplateMessage: jest.fn().mockResolvedValue({ messageId: 'wamid.template-1' }),
};

const mockConfigService = {
  get: jest.fn().mockReturnValue('123456789'),
};

describe('WhatsAppService (unit)', () => {
  let service: WhatsAppService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsAppService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WhatsAppHttpClient, useValue: mockWhatsAppHttpClient },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<WhatsAppService>(WhatsAppService);
  });

  describe('handleIncomingMessage', () => {
    it('should process incoming Meta message, creating contact, conversation, and message successfully', async () => {
      const payload = {
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    {
                      id: 'wamid.123',
                      from: '+8801700000000',
                      type: 'text',
                      text: { body: 'Hello' },
                    },
                  ],
                  contacts: [
                    {
                      profile: { name: 'John WA' },
                      wa_id: '+8801700000000',
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      mockPrisma.whatsAppMessage.findUnique.mockResolvedValue(null);
      mockPrisma.whatsAppContact.findUnique.mockResolvedValue(null);
      mockPrisma.whatsAppContact.create.mockResolvedValue({
        id: 'contact-1',
        phone: '+8801700000000',
      });
      mockPrisma.whatsAppConversation.findFirst.mockResolvedValue(null);
      mockPrisma.whatsAppConversation.create.mockResolvedValue({
        id: 'conv-1',
      });

      await service.handleIncomingMessage(payload);

      expect(mockPrisma.whatsAppContact.create).toHaveBeenCalled();
      expect(mockPrisma.whatsAppConversation.create).toHaveBeenCalled();
      expect(mockPrisma.whatsAppMessage.create).toHaveBeenCalled();
      expect(mockWhatsAppHttpClient.markAsRead).toHaveBeenCalledWith(
        'wamid.123',
      );
    });
  });

  describe('sendReply', () => {
    it('should send an outbound text message and save in the database', async () => {
      mockPrisma.whatsAppConversation.findUnique.mockResolvedValue({
        id: 'conv-1',
        contact: { phone: '+8801700000000' },
      });
      mockPrisma.whatsAppMessage.findFirst.mockResolvedValue({
        createdAt: new Date(),
        direction: 'INBOUND',
      });
      mockWhatsAppHttpClient.sendTextMessage.mockResolvedValue({
        messageId: 'wamid.out-1',
      });

      const result = await service.sendReply('conv-1', 'Replying back');

      expect(mockWhatsAppHttpClient.sendTextMessage).toHaveBeenCalledWith(
        '+8801700000000',
        'Replying back',
      );
      expect(mockPrisma.whatsAppMessage.create).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });
  });

  describe('getConversations', () => {
    it('should retrieve list of all conversations from database', async () => {
      mockPrisma.whatsAppConversation.findMany.mockResolvedValue([
        { id: 'conv-1' },
      ]);

      const result = await service.getConversations();

      expect(mockPrisma.whatsAppConversation.findMany).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });
});
