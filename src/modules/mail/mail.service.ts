import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private mailerService: MailerService) {}

  async sendVerificationCode(email: string, code: string) {
    // Log code to terminal for easy local testing
    this.logger.log(`🔑 [Verification Code] Email: ${email} | Code: ${code}`);

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Welcome to T-price - Verify Your Email',
        template: './verification', // path to template file
        context: {
          code,
        },
      });
    } catch (error: any) {
      this.logger.warn(
        `Failed to send verification email (likely SMTP is not configured): ${error.message}`,
      );
    }
  }

  async sendPasswordReset(email: string, code: string) {
    // Log code to terminal for easy local testing
    this.logger.log(`🔑 [Password Reset Code] Email: ${email} | Code: ${code}`);

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'T-price - Password Reset Request',
        template: './password-reset',
        context: {
          code,
        },
      });
    } catch (error: any) {
      this.logger.warn(
        `Failed to send password reset email (likely SMTP is not configured): ${error.message}`,
      );
    }
  }
}
