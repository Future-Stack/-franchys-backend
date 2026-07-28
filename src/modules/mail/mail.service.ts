import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

export interface QuoteEmailContext {
  customerName: string;
  quoteNumber: string;
  poNumber?: string | null;
  dueDate?: string | null;
  deliveryMethod?: string | null;
  subtotal: string;
  discount?: string | null;
  taxRate: string;
  taxAmount: string;
  total: string;
  quoteLink: string;
  year: number;
}

export interface InvoiceEmailContext {
  customerName: string;
  invoiceNumber: string;
  total: string;
  amountDue: string;
  dueDate?: string | null;
  hostedInvoiceUrl: string;
  year: number;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private mailerService: MailerService,
    private configService: ConfigService,
  ) {}

  async sendVerificationCode(email: string, code: string) {
    // Log code to terminal for easy local testing
    this.logger.log(`🔑 [Verification Code] Email: ${email} | Code: ${code}`);

    try {
      const mailUser = this.configService.get('MAIL_USER');
      await this.mailerService.sendMail({
        to: email,
        from: `"No Reply" <${mailUser}>`,
        subject: 'Welcome to MAK SERVI - Verify Your Email',
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
      const mailUser = this.configService.get('MAIL_USER');
      await this.mailerService.sendMail({
        to: email,
        from: `"No Reply" <${mailUser}>`,
        subject: 'MAK SERVI - Password Reset Request',
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

  /**
   * Send a quote delivery email to the customer.
   * Uses the quote-delivery.hbs Handlebars template.
   * Throws on failure so the caller can log the error to QuoteDeliveryLog.
   */
  async sendQuote(email: string, context: QuoteEmailContext): Promise<void> {
    this.logger.log(
      `📧 [Quote Email] Sending quote ${context.quoteNumber} to ${email}`,
    );

    await this.mailerService.sendMail({
      to: email,
      subject: `Your Quote ${context.quoteNumber} is Ready — MAK SERVI`,
      template: './quote-delivery',
      context,
    });

    this.logger.log(
      `✅ [Quote Email] Successfully sent ${context.quoteNumber} to ${email}`,
    );
  }

  /**
   * Send an invoice payment email to the customer.
   * Uses the invoice-delivery.hbs Handlebars template.
   * Contains the hosted_invoice_url (Stripe link, never expires).
   */
  async sendInvoice(
    email: string,
    context: InvoiceEmailContext,
  ): Promise<void> {
    this.logger.log(
      `📧 [Invoice Email] Sending invoice ${context.invoiceNumber} to ${email}`,
    );

    await this.mailerService.sendMail({
      to: email,
      subject: `Invoice ${context.invoiceNumber} — Payment Due`,
      template: './invoice-delivery',
      context,
    });

    this.logger.log(
      `✅ [Invoice Email] Successfully sent ${context.invoiceNumber} to ${email}`,
    );
  }
}
