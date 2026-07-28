import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';
import { MailService } from '../mail/mail.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import {
  CreateCustomerInvoiceDto,
  UpdateCustomerInvoiceDto,
  SendInvoiceDto,
  GetInvoicesDto,
} from './dto/customer-invoice.dto';

@Injectable()
export class CustomerInvoiceService {
  private readonly logger = new Logger(CustomerInvoiceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
    private readonly mailService: MailService,
    private readonly whatsAppService: WhatsAppService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // INVOICE NUMBER GENERATION
  // Uses invoiceSeed from InvoiceInformation — increments atomically in transaction
  // ─────────────────────────────────────────────────────────────────────────

  private async generateInvoiceNumber(): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      const info = await tx.invoiceInformation.findFirst();
      const seed = info?.invoiceSeed ?? 1;
      const invoiceNumber = `INV-${seed}`;
      await tx.invoiceInformation.updateMany({
        data: { invoiceSeed: seed + 1 },
      });
      return invoiceNumber;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CALCULATE TOTALS
  // ─────────────────────────────────────────────────────────────────────────

  private calculateTotals(
    lineItems: { quantity: number; unitPrice: number }[],
    discount = 0,
    taxRate = 7.0,
  ) {
    const subtotal = lineItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );
    const taxAmount = (subtotal - discount) * (taxRate / 100);
    const total = subtotal - discount + taxAmount;
    return { subtotal, taxAmount, total };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CREATE FROM QUOTE — auto-called when quote is APPROVED
  // Copies quote line items into a new DRAFT invoice
  // ─────────────────────────────────────────────────────────────────────────

  async createFromQuote(quoteId: string): Promise<void> {
    // Avoid duplicate invoices for the same quote
    const existing = await this.prisma.customerInvoice.findFirst({
      where: { quoteId },
    });
    if (existing) {
      this.logger.log(
        `Invoice already exists for quote ${quoteId}. Skipping auto-create.`,
      );
      return;
    }

    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      include: { lineItems: true, customer: true },
    });

    if (!quote) {
      this.logger.warn(`Quote ${quoteId} not found. Cannot create invoice.`);
      return;
    }

    // Get tax rate from InvoiceInformation as default
    const invoiceInfo = await this.prisma.invoiceInformation.findFirst();
    const defaultTaxRate = Number(invoiceInfo?.invoiceTaxRate ?? 7.0);

    const invoiceNumber = await this.generateInvoiceNumber();
    const lineItemsData = quote.lineItems.map((item) => ({
      description:
        item.description ||
        [item.category, item.color, item.itemNumber]
          .filter(Boolean)
          .join(' — ') ||
        'Item',
      quantity: item.itemsCount || 1,
      unitPrice: Number(item.unitPrice),
      total: Number(item.total),
    }));

    const discount = Number(quote.discount ?? 0);
    const taxRate = Number(quote.taxRate ?? defaultTaxRate);
    const { subtotal, taxAmount, total } = this.calculateTotals(
      lineItemsData,
      discount,
      taxRate,
    );

    await this.prisma.customerInvoice.create({
      data: {
        invoiceNumber,
        customerId: quote.customerId,
        quoteId,
        subtotal,
        discount,
        taxRate,
        taxAmount,
        total,
        amountPaid: 0,
        amountDue: total,
        status: 'DRAFT',
        lineItems: {
          create: lineItemsData,
        },
      },
    });

    this.logger.log(
      `✅ Auto-created invoice ${invoiceNumber} (DRAFT) from quote ${quoteId}`,
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CREATE MANUALLY — admin creates an invoice without a quote
  // ─────────────────────────────────────────────────────────────────────────

  async create(dto: CreateCustomerInvoiceDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer) {
      throw new NotFoundException(`Customer ${dto.customerId} not found`);
    }

    const invoiceInfo = await this.prisma.invoiceInformation.findFirst();
    const defaultTaxRate = Number(invoiceInfo?.invoiceTaxRate ?? 7.0);

    const taxRate = dto.taxRate ?? defaultTaxRate;
    const discount = dto.discount ?? 0;
    const { subtotal, taxAmount, total } = this.calculateTotals(
      dto.lineItems,
      discount,
      taxRate,
    );

    const invoiceNumber = await this.generateInvoiceNumber();

    return this.prisma.customerInvoice.create({
      data: {
        invoiceNumber,
        customerId: dto.customerId,
        quoteId: dto.quoteId,
        subtotal,
        discount,
        taxRate,
        taxAmount,
        total,
        amountPaid: 0,
        amountDue: total,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        notes: dto.notes,
        status: 'DRAFT',
        paymentTermId: dto.paymentTermId,
        lineItems: {
          create: dto.lineItems.map((li) => ({
            description: li.description,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            total: li.quantity * li.unitPrice,
          })),
        },
      },
      include: {
        customer: true,
        lineItems: true,
        paymentTerm: true,
        quote: { select: { quoteNumber: true } },
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // READ — list & single
  // ─────────────────────────────────────────────────────────────────────────

  async findAll(query: GetInvoicesDto) {
    const { page = 1, limit = 10, customerId, quoteId, status } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (customerId) where.customerId = customerId;
    if (quoteId) where.quoteId = quoteId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.customerInvoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
              email: true,
            },
          },
          paymentTerm: true,
          quote: { select: { quoteNumber: true, status: true } },
          installments: { orderBy: { installmentNumber: 'asc' } },
          payments: { orderBy: { createdAt: 'desc' } },
        },
      }),
      this.prisma.customerInvoice.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const invoice = await this.prisma.customerInvoice.findUnique({
      where: { id },
      include: {
        customer: true,
        paymentTerm: true,
        quote: {
          select: { quoteNumber: true, status: true, lineItems: true },
        },
        lineItems: true,
        installments: { orderBy: { installmentNumber: 'asc' } },
        payments: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!invoice) throw new NotFoundException(`Invoice ${id} not found`);
    return invoice;
  }

  async getInvoiceSummary() {
    const invoices = await this.prisma.customerInvoice.findMany({
      where: {
        status: {
          notIn: ['VOID', 'UNCOLLECTIBLE'],
        },
      },
      include: {
        installments: true,
      },
    });

    let outstanding = 0;
    let overdue = 0;
    let collected = 0;

    invoices.forEach((inv) => {
      const amountDue = Number(inv.amountDue) || 0;
      const amountPaid = Number(inv.amountPaid) || 0;

      collected += amountPaid;
      outstanding += amountDue;

      if (inv.installments && inv.installments.length > 0) {
        inv.installments.forEach((inst) => {
          if (inst.status === 'OVERDUE') {
            overdue += Number(inst.amount) || 0;
          }
        });
      } else {
        if (inv.status === 'OVERDUE') {
          overdue += amountDue;
        }
      }
    });

    return {
      outstanding: parseFloat(outstanding.toFixed(2)),
      overdue: parseFloat(overdue.toFixed(2)),
      collected: parseFloat(collected.toFixed(2)),
    };
  }

  async getPaymentSummary() {
    const [succeededAgg, completedCount, pendingCount, failedCount] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { status: 'succeeded' },
        _sum: { amount: true },
      }),
      this.prisma.payment.count({
        where: { status: 'succeeded' },
      }),
      this.prisma.payment.count({
        where: { status: 'pending' },
      }),
      this.prisma.payment.count({
        where: { status: 'failed' },
      }),
    ]);

    const totalRevenue = Number(succeededAgg._sum.amount) || 0;

    return {
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      completedPayments: completedCount,
      pendingPayments: pendingCount,
      failedPayments: failedCount,
    };
  }

  async getPaymentsList(query: { page?: number; limit?: number; status?: string }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) {
      const statusLower = query.status.toLowerCase();
      if (statusLower === 'completed') {
        where.status = 'succeeded';
      } else if (statusLower === 'pending') {
        where.status = 'pending';
      } else if (statusLower === 'failed') {
        where.status = 'failed';
      } else {
        where.status = query.status;
      }
    }

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          invoice: { select: { invoiceNumber: true } },
          customer: {
            select: {
              firstName: true,
              lastName: true,
              companyName: true,
            },
          },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    const formattedPayments = payments.map((p) => {
      let displayStatus = 'Pending';
      if (p.status === 'succeeded') displayStatus = 'Completed';
      else if (p.status === 'failed') displayStatus = 'Failed';
      else if (p.status === 'refunded') displayStatus = 'Refunded';

      return {
        id: p.id,
        paymentId: `PAY-${p.id.substring(0, 6).toUpperCase()}`,
        invoiceId: p.invoiceId,
        invoiceNumber: p.invoice?.invoiceNumber || '',
        customerName: p.customer
          ? p.customer.companyName || `${p.customer.firstName} ${p.customer.lastName}`
          : '',
        amount: Number(p.amount),
        date: p.paidAt || p.createdAt,
        method: p.paymentMethod,
        status: displayStatus,
      };
    });

    return {
      data: formattedPayments,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // UPDATE — admin edits DRAFT invoice before sending
  // ─────────────────────────────────────────────────────────────────────────

  async update(id: string, dto: UpdateCustomerInvoiceDto) {
    const invoice = await this.findOne(id);

    if (invoice.status !== 'DRAFT') {
      throw new BadRequestException(
        `Invoice ${invoice.invoiceNumber} cannot be edited — it is already ${invoice.status}. Only DRAFT invoices can be modified.`,
      );
    }

    const taxRate = dto.taxRate ?? Number(invoice.taxRate);
    const discount = dto.discount ?? Number(invoice.discount);

    let subtotal = Number(invoice.subtotal);
    let taxAmount = Number(invoice.taxAmount);
    let total = Number(invoice.total);

    // If line items are being replaced, recalculate totals
    if (dto.lineItems) {
      const calc = this.calculateTotals(dto.lineItems, discount, taxRate);
      subtotal = calc.subtotal;
      taxAmount = calc.taxAmount;
      total = calc.total;
    } else if (dto.taxRate !== undefined || dto.discount !== undefined) {
      const calc = this.calculateTotals(
        invoice.lineItems.map((li) => ({
          quantity: li.quantity,
          unitPrice: Number(li.unitPrice),
        })),
        discount,
        taxRate,
      );
      subtotal = calc.subtotal;
      taxAmount = calc.taxAmount;
      total = calc.total;
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.lineItems) {
        await tx.invoiceLineItem.deleteMany({ where: { invoiceId: id } });
      }

      return tx.customerInvoice.update({
        where: { id },
        data: {
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          notes: dto.notes,
          taxRate,
          discount,
          subtotal,
          taxAmount,
          total,
          amountDue: total - Number(invoice.amountPaid),
          paymentTerm: dto.paymentTermId
            ? { connect: { id: dto.paymentTermId } }
            : dto.paymentTermId === null
              ? { disconnect: true }
              : undefined,
          ...(dto.lineItems && {
            lineItems: {
              create: dto.lineItems.map((li) => ({
                description: li.description,
                quantity: li.quantity,
                unitPrice: li.unitPrice,
                total: li.quantity * li.unitPrice,
              })),
            },
          }),
        },
        include: {
          customer: true,
          lineItems: true,
          paymentTerm: true,
        },
      });
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SEND INVOICE — the main action: creates Stripe invoice(s) and sends to customer
  // ─────────────────────────────────────────────────────────────────────────

  async sendInvoice(id: string, dto: SendInvoiceDto = {}) {
    const invoice = await this.findOne(id);
    const { sendEmail = true, sendWhatsApp = true } = dto;

    if (!['DRAFT', 'OPEN'].includes(invoice.status)) {
      throw new BadRequestException(
        `Invoice ${invoice.invoiceNumber} is ${invoice.status} and cannot be sent again.`,
      );
    }

    if (invoice.lineItems.length === 0) {
      throw new BadRequestException(
        `Invoice ${invoice.invoiceNumber} has no line items. Add items before sending.`,
      );
    }

    // Get or create Stripe customer
    const stripeCustomerId = await this.stripeService.getOrCreateStripeCustomer(
      invoice.customerId,
    );

    const invoiceInfo = await this.prisma.invoiceInformation.findFirst();
    const currency = (invoiceInfo?.currency ?? 'USD').toLowerCase();
    const paymentTerm = invoice.paymentTerm;
    const total = Number(invoice.total);

    let hostedInvoiceUrl: string;

    if (paymentTerm?.depositPercent) {
      // ── PARTIAL PAYMENT: create installment records + send installment #1 ──
      hostedInvoiceUrl = await this.createAndSendPartialPayment(
        invoice,
        paymentTerm,
        stripeCustomerId,
        currency,
      );
    } else {
      // ── FULL PAYMENT: single Stripe invoice ──
      const stripeResult = await this.stripeService.createAndFinalizeInvoice({
        stripeCustomerId,
        invoiceNumber: invoice.invoiceNumber,
        description: `Invoice ${invoice.invoiceNumber}`,
        lineItems: invoice.lineItems.map((li) => ({
          description: li.description,
          amount: Number(li.unitPrice),
          quantity: li.quantity,
        })),
        totalAmount: total,
        dueDate: invoice.dueDate,
        currency,
        orderTotal: total,
        alreadyPaid: 0,
        remainingAfter: 0,
      });

      // Save Stripe details to invoice
      await this.prisma.customerInvoice.update({
        where: { id },
        data: {
          stripeCustomerId,
          stripeInvoiceId: stripeResult.stripeInvoiceId,
          hostedInvoiceUrl: stripeResult.hostedInvoiceUrl,
          invoicePdfUrl: stripeResult.invoicePdfUrl,
          status: 'OPEN',
          sentAt: new Date(),
        },
      });

      hostedInvoiceUrl = stripeResult.hostedInvoiceUrl;
    }

    // Send notifications to customer
    await this.sendPaymentNotifications(
      invoice,
      hostedInvoiceUrl,
      sendEmail,
      sendWhatsApp,
    );

    return this.findOne(id);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PARTIAL PAYMENT: Create installment records + Stripe invoice for #1
  // Returns hosted_invoice_url for installment #1
  // ─────────────────────────────────────────────────────────────────────────

  private async createAndSendPartialPayment(
    invoice: any,
    paymentTerm: any,
    stripeCustomerId: string,
    currency: string,
  ): Promise<string> {
    const total = Number(invoice.total);
    const depositPercent = Number(paymentTerm.depositPercent);
    const balancePercent = 100 - depositPercent;

    const depositAmount = parseFloat(
      ((total * depositPercent) / 100).toFixed(2),
    );
    const balanceAmount = parseFloat((total - depositAmount).toFixed(2));

    const now = new Date();
    const depositDue = new Date(now);
    depositDue.setDate(depositDue.getDate() + 1); // deposit due in 1 day

    const balanceDue = new Date(now);
    balanceDue.setDate(balanceDue.getDate() + paymentTerm.paymentDaysAllowed);

    // Clear any existing installments from a previous failed send attempt
    await this.prisma.invoiceInstallment.deleteMany({
      where: { invoiceId: invoice.id },
    });

    // Create both installment records
    await this.prisma.invoiceInstallment.createMany({
      data: [
        {
          invoiceId: invoice.id,
          installmentNumber: 1,
          label: `Deposit (${depositPercent}%)`,
          percentAmount: depositPercent,
          amount: depositAmount,
          dueDate: depositDue,
          status: 'PENDING',
        },
        {
          invoiceId: invoice.id,
          installmentNumber: 2,
          label: `Balance (${balancePercent}%)`,
          percentAmount: balancePercent,
          amount: balanceAmount,
          dueDate: balanceDue,
          status: 'PENDING',
        },
      ],
    });

    // Update invoice status
    await this.prisma.customerInvoice.update({
      where: { id: invoice.id },
      data: {
        stripeCustomerId,
        status: 'OPEN',
        sentAt: new Date(),
      },
    });

    // Create & send Stripe invoice for installment #1 only
    return this.createAndSendInstallment(
      invoice.id,
      1,
      stripeCustomerId,
      currency,
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CREATE + SEND one installment's Stripe invoice
  // Called immediately for #1, and auto-called by webhook for #2+
  // ─────────────────────────────────────────────────────────────────────────

  async createAndSendInstallment(
    invoiceId: string,
    installmentNumber: number,
    stripeCustomerId: string,
    currency: string,
  ): Promise<string> {
    const invoice = await this.findOne(invoiceId);
    const installment = invoice.installments.find(
      (i) => i.installmentNumber === installmentNumber,
    );

    if (!installment) {
      throw new NotFoundException(
        `Installment #${installmentNumber} not found on invoice ${invoiceId}`,
      );
    }

    const total = Number(invoice.total);
    const alreadyPaid = Number(invoice.amountPaid);
    const thisAmount = Number(installment.amount);
    const remainingAfter = total - alreadyPaid - thisAmount;

    // Installment invoice number: INV-1001-A, INV-1001-B, etc.
    const suffix = String.fromCharCode(64 + installmentNumber); // A, B, C...
    const installmentInvoiceNumber = `${invoice.invoiceNumber}-${suffix}`;

    const stripeResult = await this.stripeService.createAndFinalizeInvoice({
      stripeCustomerId,
      invoiceNumber: installmentInvoiceNumber,
      description: `${installment.label} — ${invoice.invoiceNumber}`,
      lineItems: [
        {
          description: `${installment.label} — ${invoice.invoiceNumber}`,
          amount: thisAmount,
          quantity: 1,
        },
      ],
      totalAmount: thisAmount,
      dueDate: installment.dueDate,
      currency,
      orderTotal: total,
      alreadyPaid,
      remainingAfter,
    });

    // Update installment record
    await this.prisma.invoiceInstallment.update({
      where: { id: installment.id },
      data: {
        stripeInvoiceId: stripeResult.stripeInvoiceId,
        hostedInvoiceUrl: stripeResult.hostedInvoiceUrl,
        invoicePdfUrl: stripeResult.invoicePdfUrl,
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    this.logger.log(
      `✅ Installment #${installmentNumber} (${installmentInvoiceNumber}) sent. URL: ${stripeResult.hostedInvoiceUrl}`,
    );

    return stripeResult.hostedInvoiceUrl;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STRIPE WEBHOOK HANDLER — called by StripeWebhookController
  // ─────────────────────────────────────────────────────────────────────────

  async handlePaymentSuccess(
    stripeInvoiceId: string,
    stripeEventId: string,
    amountPaidCents: number,
    stripePaymentIntentId?: string,
    stripeChargeId?: string,
    paymentMethod?: string,
  ): Promise<void> {
    // Idempotency: skip if this event was already processed
    const existingPayment = await this.prisma.payment.findUnique({
      where: { stripeEventId },
    });
    if (existingPayment) {
      this.logger.log(`Event ${stripeEventId} already processed. Skipping.`);
      return;
    }

    const amountPaid = amountPaidCents / 100; // Stripe uses cents

    // Check if this is for an installment
    const installment = await this.prisma.invoiceInstallment.findUnique({
      where: { stripeInvoiceId },
      include: { invoice: { include: { customer: true, installments: true } } },
    });

    if (installment) {
      await this.handleInstallmentPayment(
        installment,
        stripeEventId,
        amountPaid,
        stripePaymentIntentId,
        stripeChargeId,
        paymentMethod,
      );
    } else {
      // Full payment invoice
      const invoice = await this.prisma.customerInvoice.findUnique({
        where: { stripeInvoiceId },
        include: { customer: true },
      });
      if (!invoice) {
        this.logger.warn(
          `No invoice or installment found for stripeInvoiceId: ${stripeInvoiceId}`,
        );
        return;
      }
      await this.handleFullPayment(
        invoice,
        stripeEventId,
        amountPaid,
        stripePaymentIntentId,
        stripeChargeId,
        paymentMethod,
      );
    }
  }

  private async handleInstallmentPayment(
    installment: any,
    stripeEventId: string,
    amountPaid: number,
    stripePaymentIntentId?: string,
    stripeChargeId?: string,
    paymentMethod?: string,
  ) {
    const invoice = installment.invoice;
    const now = new Date();

    // Mark installment as PAID
    await this.prisma.invoiceInstallment.update({
      where: { id: installment.id },
      data: { status: 'PAID', paidAt: now },
    });

    // Create Payment record
    await this.prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        customerId: invoice.customerId,
        stripeEventId,
        stripePaymentIntentId,
        stripeChargeId,
        amount: amountPaid,
        currency: 'USD',
        status: 'succeeded',
        paymentMethod,
        paidAt: now,
      },
    });

    // Update invoice amountPaid / amountDue
    const newAmountPaid = Number(invoice.amountPaid) + amountPaid;
    const newAmountDue = Number(invoice.total) - newAmountPaid;
    const isFullyPaid = newAmountDue <= 0.01; // tolerance for floating point

    await this.prisma.customerInvoice.update({
      where: { id: invoice.id },
      data: {
        amountPaid: newAmountPaid,
        amountDue: Math.max(0, newAmountDue),
        status: isFullyPaid ? 'PAID' : 'PARTIAL',
        paidAt: isFullyPaid ? now : undefined,
      },
    });

    this.logger.log(
      `💰 Installment #${installment.installmentNumber} paid ($${amountPaid}). Invoice ${invoice.invoiceNumber} — ${isFullyPaid ? 'FULLY PAID' : 'PARTIAL'}`,
    );

    // Auto-send next installment if exists
    if (!isFullyPaid) {
      const nextInstallment = invoice.installments.find(
        (i: any) =>
          i.installmentNumber === installment.installmentNumber + 1 &&
          i.status === 'PENDING',
      );

      if (nextInstallment) {
        this.logger.log(
          `🔄 Auto-sending installment #${nextInstallment.installmentNumber} for invoice ${invoice.invoiceNumber}`,
        );

        const hostedUrl = await this.createAndSendInstallment(
          invoice.id,
          nextInstallment.installmentNumber,
          invoice.stripeCustomerId,
          'usd',
        );

        // Notify customer about next payment
        await this.sendPaymentNotifications(
          {
            ...invoice,
            invoiceNumber: `${invoice.invoiceNumber} (Installment ${nextInstallment.installmentNumber})`,
          },
          hostedUrl,
          true,
          true,
        );
      }
    }
  }

  private async handleFullPayment(
    invoice: any,
    stripeEventId: string,
    amountPaid: number,
    stripePaymentIntentId?: string,
    stripeChargeId?: string,
    paymentMethod?: string,
  ) {
    const now = new Date();

    await this.prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        customerId: invoice.customerId,
        stripeEventId,
        stripePaymentIntentId,
        stripeChargeId,
        amount: amountPaid,
        currency: 'USD',
        status: 'succeeded',
        paymentMethod,
        paidAt: now,
      },
    });

    await this.prisma.customerInvoice.update({
      where: { id: invoice.id },
      data: {
        amountPaid,
        amountDue: 0,
        status: 'PAID',
        paidAt: now,
      },
    });

    this.logger.log(
      `💰 Full payment received ($${amountPaid}) for invoice ${invoice.invoiceNumber}. Status: PAID`,
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VOID INVOICE — admin cancels an invoice
  // ─────────────────────────────────────────────────────────────────────────

  async voidInvoice(id: string) {
    const invoice = await this.findOne(id);
    if (invoice.status === 'PAID') {
      throw new BadRequestException('Cannot void a fully paid invoice.');
    }
    return this.prisma.customerInvoice.update({
      where: { id },
      data: { status: 'VOID' },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SEND REMINDER — resend existing payment link (link never expires!)
  // ─────────────────────────────────────────────────────────────────────────

  async sendReminder(id: string) {
    const invoice = await this.findOne(id);

    if (invoice.status === 'PAID') {
      throw new BadRequestException('Invoice is already paid.');
    }

    // Find the active (SENT or OVERDUE) installment to resend, or use full invoice URL
    const activeInstallment = invoice.installments.find((i: any) =>
      ['SENT', 'OVERDUE'].includes(i.status),
    );

    const hostedUrl =
      activeInstallment?.hostedInvoiceUrl ?? invoice.hostedInvoiceUrl;

    if (!hostedUrl) {
      throw new BadRequestException(
        `Invoice ${invoice.invoiceNumber} has not been sent yet. Use the Send endpoint first.`,
      );
    }

    await this.sendPaymentNotifications(invoice, hostedUrl, true, true);
    return {
      success: true,
      message: 'Reminder sent',
      hostedInvoiceUrl: hostedUrl,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // NOTIFICATIONS — send payment link via email and/or WhatsApp
  // ─────────────────────────────────────────────────────────────────────────

  private async sendPaymentNotifications(
    invoice: any,
    hostedInvoiceUrl: string,
    sendEmail: boolean,
    sendWhatsApp: boolean,
  ) {
    // Query database to ensure we have the fresh invoice with installments included
    const freshInvoice = await this.prisma.customerInvoice.findUnique({
      where: { id: invoice.id },
      include: { customer: true, installments: true },
    });

    if (!freshInvoice) {
      this.logger.warn(
        `Invoice ${invoice.id} not found when trying to send notifications`,
      );
      return;
    }

    const customer = freshInvoice.customer;
    const fmt = (v: number) => `$${v.toFixed(2)}`;

    // Find if the payment URL corresponds to a specific installment
    const activeInstallment = freshInvoice.installments.find(
      (i: any) => i.hostedInvoiceUrl === hostedInvoiceUrl,
    );

    const amountDueVal = activeInstallment
      ? Number(activeInstallment.amount)
      : Number(freshInvoice.amountDue);

    const dueDateVal = activeInstallment
      ? activeInstallment.dueDate
      : freshInvoice.dueDate;

    const installmentLabel = activeInstallment ? activeInstallment.label : null;

    const installmentsList = freshInvoice.installments.map((i: any) => {
      let displayStatus = 'Unpaid';
      if (i.status === 'PAID') displayStatus = 'Paid';
      else if (i.status === 'OVERDUE') displayStatus = 'Overdue';

      return {
        label: i.label,
        amount: fmt(Number(i.amount)),
        status: displayStatus,
        isPaid: i.status === 'PAID',
        isOverdue: i.status === 'OVERDUE',
        dueDate: i.dueDate
          ? new Date(i.dueDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })
          : null,
      };
    });

    const context = {
      customerName:
        customer.companyName ?? `${customer.firstName} ${customer.lastName}`,
      invoiceNumber: freshInvoice.invoiceNumber,
      total: fmt(Number(freshInvoice.total)),
      amountDue: fmt(amountDueVal),
      dueDate: dueDateVal
        ? new Date(dueDateVal).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : null,
      installmentLabel,
      isInstallment: !!activeInstallment,
      installmentNumber: activeInstallment ? activeInstallment.installmentNumber : null,
      totalInstallmentsCount: freshInvoice.installments.length,
      amountPaidTotal: fmt(Number(freshInvoice.amountPaid)),
      amountRemaining: fmt(Number(freshInvoice.amountDue)),
      installmentsList,
      hostedInvoiceUrl,
      year: new Date().getFullYear(),
    };

    if (sendEmail && customer.email) {
      try {
        await this.mailService.sendInvoice(customer.email, context);
        this.logger.log(`📧 Invoice email sent to ${customer.email}`);
      } catch (err: any) {
        this.logger.warn(`Failed to send invoice email: ${err.message}`);
      }
    }

    if (sendWhatsApp && customer.phone) {
      try {
        await this.whatsAppService.sendInvoiceMessage(customer.phone, context);
        this.logger.log(`💬 Invoice WhatsApp sent to ${customer.phone}`);
      } catch (err: any) {
        this.logger.warn(`Failed to send invoice WhatsApp: ${err.message}`);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CRON: Mark overdue installments every day at 9am
  // ─────────────────────────────────────────────────────────────────────────

  @Cron('0 9 * * *')
  async checkOverdueInstallments() {
    const now = new Date();

    const overdueInstallments = await this.prisma.invoiceInstallment.findMany({
      where: {
        status: 'SENT',
        dueDate: { lt: now },
      },
    });

    for (const installment of overdueInstallments) {
      await this.prisma.invoiceInstallment.update({
        where: { id: installment.id },
        data: { status: 'OVERDUE' },
      });
    }

    // Mark parent invoices as OVERDUE if any installment is overdue
    const overdueInvoices = await this.prisma.customerInvoice.findMany({
      where: {
        status: { in: ['OPEN', 'PARTIAL'] },
        dueDate: { lt: now },
        installments: { every: { status: { not: 'PAID' } } },
      },
    });

    for (const invoice of overdueInvoices) {
      await this.prisma.customerInvoice.update({
        where: { id: invoice.id },
        data: { status: 'OVERDUE' },
      });
    }

    if (overdueInstallments.length > 0 || overdueInvoices.length > 0) {
      this.logger.log(
        `⏰ Cron: Marked ${overdueInstallments.length} installments and ${overdueInvoices.length} invoices as OVERDUE`,
      );
    }
  }
}
