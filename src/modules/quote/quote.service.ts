import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma, QuoteStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateQuoteDto, UpdateQuoteDto } from './dto/quote.dto';
import { GetQuotesDto } from './dto/get-quotes.dto';
import { JobService } from '../job/job.service';
import { MailService } from '../mail/mail.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';


interface CalcLineItemInput {
  groupName?: string;
  categoryId?: string | null;
  itemNumber?: string | null;
  color?: string | null;
  description?: string | null;
  sizeM?: number;
  sizeL?: number;
  sizeXL?: number;
  markupPrice?: any;
  unitPrice?: any;
  isTaxed?: boolean;
  imprintType?: string | null;
}

interface CalcLineItemOutput {
  groupName: string;
  categoryId: string | null;
  itemNumber: string | null;
  color: string | null;
  description: string | null;
  sizeM: number;
  sizeL: number;
  sizeXL: number;
  markupPrice: number;
  unitPrice: number;
  isTaxed: boolean;
  imprintType: string | null;
  itemsCount: number;
  total: number;
}

@Injectable()
export class QuoteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobService: JobService,
    private readonly mailService: MailService,
    private readonly whatsAppService: WhatsAppService,
  ) {}

  private async generateNextQuoteNumber(): Promise<string> {
    const lastQuote = await this.prisma.quote.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { quoteNumber: true },
    });

    if (!lastQuote || !lastQuote.quoteNumber) {
      return 'Q-1001';
    }

    const match = lastQuote.quoteNumber.match(/^Q-(\d+)$/);
    if (!match) {
      return 'Q-1001';
    }

    const nextNum = parseInt(match[1], 10) + 1;
    return `Q-${nextNum}`;
  }

  private calculateTotals(
    lineItems: CalcLineItemInput[],
    discountVal: number = 0,
    taxRateVal: number = 7.0,
  ): {
    subtotal: number;
    taxAmount: number;
    total: number;
    processedItems: CalcLineItemOutput[];
  } {
    let subtotal = 0;

    const processedItems: CalcLineItemOutput[] = lineItems.map((item) => {
      const sizeM = item.sizeM || 0;
      const sizeL = item.sizeL || 0;
      const sizeXL = item.sizeXL || 0;
      const itemsCount = sizeM + sizeL + sizeXL;
      const markupPrice = Number(item.markupPrice) || 0; // percentage markup, e.g. 15%
      const unitPrice = Number(item.unitPrice) || 0;

      // Calculate item total: price + markup, times count
      const finalUnitPrice = unitPrice * (1 + markupPrice / 100);
      const total = finalUnitPrice * itemsCount;

      subtotal += total;

      return {
        groupName: item.groupName || 'Group 1',
        categoryId: item.categoryId || null,
        itemNumber: item.itemNumber || null,
        color: item.color || null,
        description: item.description || null,
        sizeM,
        sizeL,
        sizeXL,
        markupPrice,
        unitPrice,
        isTaxed: !!item.isTaxed,
        imprintType: item.imprintType || null,
        itemsCount,
        total,
      };
    });

    const taxAmount = (subtotal - discountVal) * (taxRateVal / 100);
    const total = subtotal - discountVal + taxAmount;

    return {
      subtotal,
      taxAmount,
      total,
      processedItems,
    };
  }

  async create(dto: CreateQuoteDto) {
    // Verify customer exists
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer) {
      throw new NotFoundException(
        `Customer with ID ${dto.customerId} not found`,
      );
    }

    // Verify representative user exists
    const rep = await this.prisma.user.findUnique({
      where: { userId: dto.repId },
    });
    if (!rep) {
      throw new NotFoundException(
        `Representative User with ID ${dto.repId} not found`,
      );
    }

    const quoteNumber = await this.generateNextQuoteNumber();
    const { subtotal, taxAmount, total, processedItems } = this.calculateTotals(
      dto.lineItems,
      dto.discount,
      dto.taxRate,
    );

    const quote = await this.prisma.quote.create({
      data: {
        quoteNumber,
        customerId: dto.customerId,
        repId: dto.repId,
        poNumber: dto.poNumber,
        deliveryMethod: dto.deliveryMethod,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        status: dto.status,
        subtotal,
        discount: dto.discount || 0,
        taxRate: dto.taxRate || 7.0,
        taxAmount,
        total,
        notes: dto.notes,
        lineItems: {
          create: processedItems.map((item) => ({
            groupName: item.groupName,
            categoryId: item.categoryId,
            itemNumber: item.itemNumber,
            color: item.color,
            description: item.description,
            sizeM: item.sizeM,
            sizeL: item.sizeL,
            sizeXL: item.sizeXL,
            itemsCount: item.itemsCount,
            markupPrice: item.markupPrice,
            unitPrice: item.unitPrice,
            isTaxed: item.isTaxed,
            total: item.total,
            imprintType: item.imprintType,
          })),
        },
      },
      include: {
        lineItems: true,
        customer: true,
        rep: {
          select: {
            userId: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (quote.status === QuoteStatus.APPROVED) {
      await this.jobService.createOrUpdateJobFromQuote(quote.id);
    }

    return quote;
  }

  async findAll(query: GetQuotesDto) {
    const { page = 1, limit = 10, search, status } = query;
    const skip = (page - 1) * limit;

    const whereClause: Prisma.QuoteWhereInput = {};

    if (status) {
      whereClause.status = status;
    }

    if (search) {
      whereClause.OR = [
        { quoteNumber: { contains: search, mode: 'insensitive' } },
        { customer: { firstName: { contains: search, mode: 'insensitive' } } },
        { customer: { lastName: { contains: search, mode: 'insensitive' } } },
        {
          customer: { companyName: { contains: search, mode: 'insensitive' } },
        },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.quote.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          lineItems: true,
          customer: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.quote.count({ where: whereClause }),
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
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: {
        lineItems: true,
        customer: true,
        rep: {
          select: {
            userId: true,
            email: true,
            name: true,
          },
        },
      },
    });
    if (!quote) {
      throw new NotFoundException(`Quote with ID ${id} not found`);
    }
    return quote;
  }

  async update(id: string, dto: UpdateQuoteDto) {
    const existing = await this.findOne(id);

    // If changing customer
    if (dto.customerId && dto.customerId !== existing.customerId) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: dto.customerId },
      });
      if (!customer) {
        throw new NotFoundException(
          `Customer with ID ${dto.customerId} not found`,
        );
      }
    }

    // If changing rep
    if (dto.repId && dto.repId !== existing.repId) {
      const rep = await this.prisma.user.findUnique({
        where: { userId: dto.repId },
      });
      if (!rep) {
        throw new NotFoundException(
          `Representative User with ID ${dto.repId} not found`,
        );
      }
    }

    // If updating line items, recalculate totals
    let updatedTotals: {
      subtotal?: number;
      taxAmount?: number;
      total?: number;
      processedItems?: CalcLineItemOutput[];
    } = {};
    if (dto.lineItems) {
      const discount =
        dto.discount !== undefined ? dto.discount : Number(existing.discount);
      const taxRate =
        dto.taxRate !== undefined ? dto.taxRate : Number(existing.taxRate);

      updatedTotals = this.calculateTotals(dto.lineItems, discount, taxRate);
    } else if (dto.discount !== undefined || dto.taxRate !== undefined) {
      // Recalculate totals based on existing line items but new discount/tax rates
      const discount =
        dto.discount !== undefined ? dto.discount : Number(existing.discount);
      const taxRate =
        dto.taxRate !== undefined ? dto.taxRate : Number(existing.taxRate);

      updatedTotals = this.calculateTotals(
        existing.lineItems,
        discount,
        taxRate,
      );
    }

    // Run in a transaction to safely update and recreate line items if provided
    const updatedQuote = await this.prisma.$transaction(async (tx) => {
      if (dto.lineItems) {
        // Delete existing line items
        await tx.quoteLineItem.deleteMany({
          where: { quoteId: id },
        });
      }

      return tx.quote.update({
        where: { id },
        data: {
          customerId: dto.customerId,
          repId: dto.repId,
          poNumber: dto.poNumber,
          deliveryMethod: dto.deliveryMethod,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          status: dto.status,
          notes: dto.notes,
          subtotal:
            updatedTotals.subtotal !== undefined
              ? updatedTotals.subtotal
              : undefined,
          discount: dto.discount !== undefined ? dto.discount : undefined,
          taxRate: dto.taxRate !== undefined ? dto.taxRate : undefined,
          taxAmount:
            updatedTotals.taxAmount !== undefined
              ? updatedTotals.taxAmount
              : undefined,
          total:
            updatedTotals.total !== undefined ? updatedTotals.total : undefined,
          lineItems:
            dto.lineItems && updatedTotals.processedItems
              ? {
                  create: updatedTotals.processedItems.map(
                    (item: CalcLineItemOutput) => ({
                      groupName: item.groupName,
                      categoryId: item.categoryId,
                      itemNumber: item.itemNumber,
                      color: item.color,
                      description: item.description,
                      sizeM: item.sizeM,
                      sizeL: item.sizeL,
                      sizeXL: item.sizeXL,
                      itemsCount: item.itemsCount,
                      markupPrice: item.markupPrice,
                      unitPrice: item.unitPrice,
                      isTaxed: item.isTaxed,
                      total: item.total,
                      imprintType: item.imprintType,
                    }),
                  ),
                }
              : undefined,
        },
        include: {
          lineItems: true,
          customer: true,
          rep: {
            select: {
              userId: true,
              email: true,
              name: true,
            },
          },
        },
      });
    });

    if (updatedQuote.status === QuoteStatus.APPROVED) {
      await this.jobService.createOrUpdateJobFromQuote(updatedQuote.id);
    }

    return updatedQuote;
  }

  async updateStatusWithPermissionCheck(
    id: string,
    status: string,
    user: { userId: string; email: string; role: string },
  ) {
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
      const permissions = await this.prisma.userPermission.findFirst({
        where: { userId: user.userId },
      });

      if (!permissions || !permissions.canApproveQuotes) {
        throw new ForbiddenException(
          'You do not have permission to approve or change quote status',
        );
      }
    }

    const quote = await this.prisma.quote.update({
      where: { id },
      data: { status: status as QuoteStatus },
      include: {
        lineItems: true,
        customer: true,
        rep: {
          select: {
            userId: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (quote.status === QuoteStatus.APPROVED) {
      await this.jobService.createOrUpdateJobFromQuote(quote.id);
    }

    return quote;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.quote.delete({ where: { id } });
    return { message: 'Quote deleted successfully', id };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PUBLIC QUOTE VIEW (no auth — customer-facing)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Return full quote data without requiring JWT auth.
   * The UUID quoteId is unguessable, so this is safe without a token.
   */
  async findOnePublic(id: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: {
        lineItems: true,
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            companyName: true,
          },
        },
        rep: {
          select: {
            userId: true,
            email: true,
            name: true,
          },
        },
      },
    });

    if (!quote) {
      throw new NotFoundException(`Quote with ID ${id} not found`);
    }

    return quote;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // QUOTE DELIVERY — Email
  // ─────────────────────────────────────────────────────────────────────────────

  async sendViaEmail(
    id: string,
    frontendDomain: string,
  ): Promise<{ success: boolean; recipient: string }> {
    const quote = await this.findOne(id);
    const customer = quote.customer;
    const recipient = customer.email;

    const quoteLink = `${frontendDomain}/quotes/view?id=${id}`;
    const dueDate = quote.dueDate
      ? new Date(quote.dueDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : null;

    const fmt = (val: any) =>
      `$${parseFloat(String(val)).toFixed(2)}`;

    const context = {
      customerName: `${customer.firstName} ${customer.lastName}`,
      quoteNumber: quote.quoteNumber,
      poNumber: quote.poNumber ?? null,
      dueDate,
      deliveryMethod: quote.deliveryMethod ?? null,
      subtotal: fmt(quote.subtotal),
      discount:
        Number(quote.discount) > 0 ? fmt(quote.discount) : null,
      taxRate: String(Number(quote.taxRate)),
      taxAmount: fmt(quote.taxAmount),
      total: fmt(quote.total),
      quoteLink,
      year: new Date().getFullYear(),
    };

    let status: 'SENT' | 'FAILED' = 'SENT';
    let errorMsg: string | undefined;

    try {
      await this.mailService.sendQuote(recipient, context);
      // Update sentAt on success
      await this.prisma.quote.update({
        where: { id },
        data: { sentAt: new Date() },
      });
    } catch (err: any) {
      status = 'FAILED';
      errorMsg = err?.message ?? String(err);
      throw err; // Re-throw so controller returns 500
    } finally {
      // Always log the attempt
      await this.prisma.quoteDeliveryLog.create({
        data: {
          quoteId: id,
          channel: 'EMAIL',
          recipient,
          status,
          error: errorMsg ?? null,
        },
      });
    }

    return { success: true, recipient };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // QUOTE DELIVERY — WhatsApp
  // ─────────────────────────────────────────────────────────────────────────────

  async sendViaWhatsApp(
    id: string,
    frontendDomain: string,
  ): Promise<{ success: boolean; recipient: string; method: string }> {
    const quote = await this.findOne(id);
    const customer = quote.customer;
    const phone = customer.phone;

    const quoteLink = `${frontendDomain}/quotes/view?id=${id}`;
    const dueDate = quote.dueDate
      ? new Date(quote.dueDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : '';

    const fmt = (val: any) =>
      `$${parseFloat(String(val)).toFixed(2)}`;

    let status: 'SENT' | 'FAILED' = 'SENT';
    let errorMsg: string | undefined;
    let deliveryMethod = 'text';

    try {
      const result = await this.whatsAppService.sendQuoteMessage(phone, {
        customerName: `${customer.firstName} ${customer.lastName}`,
        quoteNumber: quote.quoteNumber,
        total: fmt(quote.total),
        dueDate,
        quoteLink,
      });
      deliveryMethod = result.method;

      // Update sentAt on success
      await this.prisma.quote.update({
        where: { id },
        data: { sentAt: new Date() },
      });
    } catch (err: any) {
      status = 'FAILED';
      errorMsg = err?.message ?? String(err);
      throw err; // Re-throw so controller returns 500
    } finally {
      // Always log the attempt
      await this.prisma.quoteDeliveryLog.create({
        data: {
          quoteId: id,
          channel: 'WHATSAPP',
          recipient: phone,
          status,
          method: deliveryMethod,
          error: errorMsg ?? null,
        },
      });
    }

    return { success: true, recipient: phone, method: deliveryMethod };
  }
}

