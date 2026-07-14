import { Test, TestingModule } from '@nestjs/testing';
import { EmailTrackerService } from './email-tracker.service';
import { PrismaService } from '../../prisma/prisma.service';
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

const mockPrisma = {
  message: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
  },
  contact: {
    findUnique: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
  },
  thread: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
};

describe('EmailTrackerService (unit)', () => {
  let service: EmailTrackerService;
  let gmailMock: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailTrackerService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<EmailTrackerService>(EmailTrackerService);
    gmailMock = (google.gmail as jest.Mock)();
  });

  describe('startGmailWatch', () => {
    it('should invoke watch successfully with topic name', async () => {
      process.env.GOOGLE_PUB_SUB_TOPIC = 'projects/test-proj/topics/gmail-topic';
      gmailMock.users.watch.mockResolvedValue({ data: { expiration: '12345' } });

      await service.startGmailWatch();

      expect(gmailMock.users.watch).toHaveBeenCalledWith({
        userId: 'me',
        requestBody: {
          topicName: 'projects/test-proj/topics/gmail-topic',
          labelIds: ['INBOX', 'SENT'],
        },
      });
    });

    it('should skip renewal if topic name is missing in env', async () => {
      delete process.env.GOOGLE_PUB_SUB_TOPIC;

      await service.startGmailWatch();

      expect(gmailMock.users.watch).not.toHaveBeenCalled();
    });
  });

  describe('syncEmails', () => {
    it('should sync recent messages in inbox/sent folder', async () => {
      gmailMock.users.getProfile.mockResolvedValue({ data: { emailAddress: 'jane@test.com' } });
      gmailMock.users.messages.list.mockResolvedValue({
        data: {
          messages: [{ id: 'msg-1' }],
        },
      });
      gmailMock.users.messages.get.mockResolvedValue({
        data: {
          id: 'msg-1',
          snippet: 'Hello there',
          payload: {
            headers: [
              { name: 'Message-ID', value: '<msg-1-uid>' },
              { name: 'From', value: 'client@client.com' },
              { name: 'To', value: 'jane@test.com' },
              { name: 'Subject', value: 'Logo Design Quote' },
            ],
          },
        },
      });

      mockPrisma.message.findUnique.mockResolvedValue(null);
      mockPrisma.contact.findUnique.mockResolvedValue({ id: 'contact-1', email: 'client@client.com' });
      mockPrisma.thread.create.mockResolvedValue({ id: 'thread-1' });
      mockPrisma.message.create.mockResolvedValue({ id: 'msg-row-1' });

      await service.syncEmails();

      expect(gmailMock.users.getProfile).toHaveBeenCalled();
      expect(gmailMock.users.messages.list).toHaveBeenCalled();
      expect(mockPrisma.message.create).toHaveBeenCalled();
    });
  });

  describe('getThreads', () => {
    it('should retrieve all threads from prisma', async () => {
      mockPrisma.thread.findMany.mockResolvedValue([{ id: 'thread-1' }]);

      const result = await service.getThreads();

      expect(mockPrisma.thread.findMany).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });
});
