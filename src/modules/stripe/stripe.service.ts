import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from 'src/prisma/prisma.service';

export interface StripeInvoiceResult {
  stripeInvoiceId: string;
  hostedInvoiceUrl: string;
  invoicePdfUrl: string;
}

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secretKey = this.configService.get<string>('stripe.secretKey');
    if (!secretKey) {
      this.logger.warn(
        '⚠️  STRIPE_SECRET_KEY is not set. Stripe features will not work.',
      );
    }
    this.stripe = new Stripe(secretKey || 'sk_test_placeholder', {
      apiVersion: '2026-06-24.dahlia',
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CUSTOMER: Get or create a Stripe Customer for a given internal Customer
  // Returns the Stripe customer ID (cus_xxxx)
  // ─────────────────────────────────────────────────────────────────────────

  async getOrCreateStripeCustomer(customerId: string): Promise<string> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new BadRequestException(`Customer ${customerId} not found`);
    }

    // Return existing Stripe customer if already created
    if (customer.stripeCustomerId) {
      this.logger.log(
        `Using existing Stripe customer ${customer.stripeCustomerId} for customer ${customerId}`,
      );
      return customer.stripeCustomerId;
    }

    // Create new Stripe customer
    const stripeCustomer = await this.stripe.customers.create({
      email: customer.email,
      name: customer.companyName
        ? customer.companyName
        : `${customer.firstName} ${customer.lastName}`,
      phone: customer.phone ?? undefined,
      metadata: {
        internalCustomerId: customer.id,
      },
    });

    // Persist the Stripe customer ID
    await this.prisma.customer.update({
      where: { id: customerId },
      data: { stripeCustomerId: stripeCustomer.id },
    });

    this.logger.log(
      `Created Stripe customer ${stripeCustomer.id} for customer ${customerId}`,
    );

    return stripeCustomer.id;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INVOICE: Create a Stripe invoice for ONE installment (or full payment)
  // Adds individual line items, then finalizes and sends.
  // Returns hosted_invoice_url and PDF URL.
  // ─────────────────────────────────────────────────────────────────────────

  async createAndFinalizeInvoice(params: {
    stripeCustomerId: string;
    invoiceNumber: string;       // e.g. "INV-1001" or "INV-1001-A"
    description: string;         // e.g. "Deposit (50%) — Custom Print Order"
    lineItems: { description: string; amount: number; quantity: number }[];
    totalAmount: number;          // total for this specific invoice/installment (in dollars)
    dueDate: Date | null;
    currency: string;
    orderTotal: number;           // FULL order total — shown in footer for context
    alreadyPaid: number;          // amount already paid — shown in footer
    remainingAfter: number;       // how much remains after this payment
    footer?: string;
  }): Promise<StripeInvoiceResult> {
    const { stripeCustomerId, invoiceNumber, description, lineItems, dueDate, currency } = params;

    // Calculate days until due (Stripe requires integer days)
    const daysUntilDue = dueDate
      ? Math.max(1, Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : 1;

    // Build footer with full order context for transparency
    const footerText =
      params.footer ||
      `Order Total: ${this.formatCurrency(params.orderTotal, currency)} | ` +
      `Previously Paid: ${this.formatCurrency(params.alreadyPaid, currency)} | ` +
      `This Payment: ${this.formatCurrency(params.totalAmount, currency)} | ` +
      `Remaining After This: ${this.formatCurrency(params.remainingAfter, currency)}`;

    // Step 1: Create the invoice in draft state first
    const invoice = await this.stripe.invoices.create({
      customer: stripeCustomerId,
      collection_method: 'send_invoice', // REQUIRED for hosted_invoice_url
      days_until_due: daysUntilDue,
      description,
      footer: footerText,
      metadata: {
        invoiceNumber,
      },
    });

    // Step 2: Create invoice items associated directly with this draft invoice
    for (const item of lineItems) {
      await this.stripe.invoiceItems.create({
        customer: stripeCustomerId,
        invoice: invoice.id, // Associate directly with this invoice
        unit_amount_decimal: String(Math.round(item.amount * 100)), // Stripe uses cents
        currency,
        description: item.description,
        quantity: item.quantity,
      } as any);
    }

    // Step 3: Finalize — locks the invoice and generates hosted_invoice_url
    const finalized = await this.stripe.invoices.finalizeInvoice(invoice.id);

    if (!finalized.hosted_invoice_url || !finalized.invoice_pdf) {
      throw new BadRequestException(
        `Stripe invoice ${invoice.id} did not return a hosted URL after finalization`,
      );
    }

    this.logger.log(
      `✅ Stripe invoice ${invoice.id} finalized. URL: ${finalized.hosted_invoice_url}`,
    );

    return {
      stripeInvoiceId: finalized.id,
      hostedInvoiceUrl: finalized.hosted_invoice_url,
      invoicePdfUrl: finalized.invoice_pdf,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // WEBHOOK: Verify Stripe webhook signature and return parsed event
  // Always call this before processing any webhook event.
  // ─────────────────────────────────────────────────────────────────────────

  constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
    const webhookSecret = this.configService.get<string>('stripe.webhookSecret');
    if (!webhookSecret) {
      throw new BadRequestException('Stripe webhook secret is not configured');
    }
    return this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  private formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  }
}
