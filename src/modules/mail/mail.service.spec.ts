import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from './mail.service';
import { MailerService } from '@nestjs-modules/mailer';

import { ConfigService } from '@nestjs/config';

const mockMailerService = {
  sendMail: jest.fn(),
};

const mockConfigService = {
  get: jest.fn().mockImplementation((key: string) => {
    if (key === 'MAIL_USER') return 'no-reply@example.com';
    return null;
  }),
};

describe('MailService (unit)', () => {
  let service: MailService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: MailerService,
          useValue: mockMailerService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  describe('sendVerificationCode', () => {
    it('should invoke mailerService.sendMail with code successfully', async () => {
      mockMailerService.sendMail.mockResolvedValue({});

      await service.sendVerificationCode('jane@test.com', '123456');

      expect(mockMailerService.sendMail).toHaveBeenCalledWith({
        to: 'jane@test.com',
        from: '"No Reply" <no-reply@example.com>',
        subject: 'Welcome to MAK SERVI - Verify Your Email',
        template: './verification',
        context: { code: '123456' },
      });
    });

    it('should catch sendMail errors silently and log a warning', async () => {
      mockMailerService.sendMail.mockRejectedValue(
        new Error('SMTP connection error'),
      );

      // Should not throw
      await expect(
        service.sendVerificationCode('jane@test.com', '123456'),
      ).resolves.not.toThrow();
    });
  });

  describe('sendPasswordReset', () => {
    it('should invoke mailerService.sendMail with code successfully', async () => {
      mockMailerService.sendMail.mockResolvedValue({});

      await service.sendPasswordReset('jane@test.com', '654321');

      expect(mockMailerService.sendMail).toHaveBeenCalledWith({
        to: 'jane@test.com',
        from: '"No Reply" <no-reply@example.com>',
        subject: 'MAK SERVI - Password Reset Request',
        template: './password-reset',
        context: { code: '654321' },
      });
    });
  });
});
