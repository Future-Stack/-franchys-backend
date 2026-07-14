import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { EmailTrackerService } from 'src/modules/email-tracker/email-tracker.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { createTestPrisma } from '../setup/test-helpers';
import { google } from 'googleapis';

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

describe('EmailTrackerService (integration)', () => {
  let module: TestingModule;
  let service: EmailTrackerService;
  let prisma: PrismaClient;
  let gmailMock: any;

  beforeAll(async () => {
    prisma = createTestPrisma();

    module = await Test.createTestingModule({
      providers: [
        EmailTrackerService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<EmailTrackerService>(EmailTrackerService);
    gmailMock = (google.gmail as jest.Mock)();
  });

  afterAll(async () => {
    // Teardown any entities created during test execution
    await prisma.message.deleteMany({
      where: { from: { contains: '@test-e-tracker.com' } },
    });
    await prisma.thread.deleteMany({
      where: { subject: { contains: 'Integration Subject' } },
    });
    await prisma.contact.deleteMany({
      where: { email: { contains: '@test-e-tracker.com' } },
    });

    await prisma.$disconnect();
    await module.close();
  });

  describe('syncEmails and message persistence', () => {
    it('should create new Contact, Thread, and Message row when syncing matching email', async () => {
      const contactEmail = `client-${Date.now()}@test-e-tracker.com`;

      gmailMock.users.getProfile.mockResolvedValue({
        data: { emailAddress: 'my-shop@shop.com' },
      });
      gmailMock.users.messages.list.mockResolvedValue({
        data: {
          messages: [{ id: 'msg-int-1' }],
        },
      });
      gmailMock.users.messages.get.mockResolvedValue({
        data: {
          id: 'msg-int-1',
          snippet: 'Can I get a quote on 20 hoodies?',
          payload: {
            headers: [
              { name: 'Message-ID', value: `<msg-int-1-uid-${Date.now()}>` },
              { name: 'From', value: contactEmail },
              { name: 'To', value: 'my-shop@shop.com' },
              { name: 'Subject', value: 'Integration Subject Quote' },
            ],
          },
        },
      });

      await service.syncEmails();

      // Check DB directly
      const contact = await prisma.contact.findUnique({
        where: { email: contactEmail },
      });
      expect(contact).toBeDefined();

      const threads = await prisma.thread.findMany({
        where: { contactId: contact?.id },
      });
      expect(threads).toHaveLength(1);
      expect(threads[0].subject).toContain('Integration Subject');

      const messages = await prisma.message.findMany({
        where: { threadId: threads[0].id },
      });
      expect(messages).toHaveLength(1);
      expect(messages[0].body).toBe('Can I get a quote on 20 hoodies?');
    });
  });

  describe('Queries', () => {
    it('should retrieve list of threads and messages successfully', async () => {
      const threads = await service.getThreads();
      expect(Array.isArray(threads)).toBe(true);

      const contacts = await service.getContacts();
      expect(Array.isArray(contacts)).toBe(true);
    });
  });
});
