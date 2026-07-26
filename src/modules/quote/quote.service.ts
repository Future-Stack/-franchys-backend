import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma, QuoteStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateQuoteDto,
  UpdateQuoteDto,
  CalculateQuoteDto,
  CreateQuoteLineItemDto,
} from './dto/quote.dto';
import { JobService } from '../job/job.service';
import { MailService } from '../mail/mail.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

interface CalcLineItemInput {
  groupName?: string;
  category?: string | null;
  itemNumber?: string | null;
  color?: string | null;
  description?: string | null;
  baseCost?: any;
  sizeBreakdown?: Record<string, number> | null;
  markupPrice?: any;
  matrixId?: string | null;
  matrixColumn?: string | null;
  printCost?: any;
  unitPrice?: any;
  isTaxed?: boolean;
  total?: any;
  imprintType?: string | null;
  mockups?: string[];
}

interface CalcLineItemOutput {
  groupName: string;
  category: string | null;
  itemNumber: string | null;
  color: string | null;
  description: string | null;
  baseCost: number;
  sizeBreakdown: Record<string, number> | null;
  itemsCount: number;
  markupPrice: number;
  matrixId: string | null;
  matrixColumn: string | null;
  printCost: number;
  unitPrice: number;
  isTaxed: boolean;
  total: number;
  imprintType: string | null;
  mockups: string[];
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

  private normalizeLineItems(dto: {
    groups?: { name: string; lineItems: CreateQuoteLineItemDto[] }[];
    lineItems?: CreateQuoteLineItemDto[];
  }): CalcLineItemInput[] {
    const normalized: CalcLineItemInput[] = [];

    if (dto.groups && dto.groups.length > 0) {
      for (const group of dto.groups) {
        if (group.lineItems && group.lineItems.length > 0) {
          for (const item of group.lineItems) {
            normalized.push({
              ...item,
              groupName: group.name || item.groupName || 'Group 1',
            });
          }
        }
      }
    } else if (dto.lineItems && dto.lineItems.length > 0) {
      for (const item of dto.lineItems) {
        normalized.push({
          ...item,
          groupName: item.groupName || 'Group 1',
        });
      }
    }

    return normalized;
  }

  private async calculateTotals(
    lineItems: CalcLineItemInput[],
    discountVal: number = 0,
    taxRateVal: number = 7.0,
    quoteTotalOverride?: number,
  ): Promise<{
    subtotal: number;
    taxAmount: number;
    total: number;
    processedItems: CalcLineItemOutput[];
  }> {
    let subtotal = 0;
    const processedItems: CalcLineItemOutput[] = [];

    for (const item of lineItems) {
      const breakdown = item.sizeBreakdown || null;
      let itemsCount = 0;
      if (breakdown && typeof breakdown === 'object') {
        for (const qty of Object.values(breakdown)) {
          const num = Number(qty);
          if (!isNaN(num) && num > 0) itemsCount += num;
        }
      } else {
        // Fallback for legacy size properties if passed
        const raw = item as any;
        const legacyCount =
          (Number(raw.sizeS) || 0) +
          (Number(raw.sizeM) || 0) +
          (Number(raw.sizeL) || 0) +
          (Number(raw.sizeXL) || 0) +
          (Number(raw.size2XL) || 0) +
          (Number(raw.size3XL) || 0);
        if (legacyCount > 0) {
          itemsCount = legacyCount;
        }
      }

      const baseCost = Number(item.baseCost) || 0;
      const matrixId = item.matrixId || null;
      const matrixColumn = item.matrixColumn || null;

      let printCost = Number(item.printCost) || 0;
      let markupPrice = Number(item.markupPrice) || 0;

      // Price Matrix Lookup if matrixId is provided and printCost/markupPrice aren't explicitly provided
      if (matrixId && itemsCount > 0) {
        const matrix = await this.prisma.priceMatrix.findUnique({
          where: { priceMatrixId: matrixId },
          include: { priceTiers: { orderBy: { quantity: 'asc' } } },
        });

        if (matrix && matrix.priceTiers.length > 0) {
          const matchingTier = matrix.priceTiers.reduce((acc, tier) => {
            if (itemsCount >= tier.quantity) {
              return tier;
            }
            return acc;
          }, matrix.priceTiers[0]);

          if (matchingTier) {
            if (!item.printCost) {
              printCost = Number(matchingTier.basePrice);
            }
            if (!item.markupPrice) {
              markupPrice = Number(matchingTier.markup);
            }
          }
        }
      }

      let finalUnitPrice = 0;
      let total = 0;

      // Check for explicit line item total override
      if (
        item.total !== undefined &&
        item.total !== null &&
        Number(item.total) > 0
      ) {
        total = Number(item.total);
        finalUnitPrice = itemsCount > 0 ? total / itemsCount : total;
      } else if (
        item.baseCost !== undefined &&
        item.baseCost !== null &&
        Number(item.baseCost) > 0
      ) {
        const garmentMarkup = 1 + markupPrice / 100;
        finalUnitPrice = baseCost * garmentMarkup + printCost;
        total = finalUnitPrice * itemsCount;
      } else if (
        item.unitPrice !== undefined &&
        item.unitPrice !== null &&
        Number(item.unitPrice) > 0
      ) {
        const garmentMarkup = 1 + markupPrice / 100;
        finalUnitPrice = Number(item.unitPrice) * garmentMarkup + printCost;
        total = finalUnitPrice * itemsCount;
      } else {
        const garmentMarkup = 1 + markupPrice / 100;
        finalUnitPrice = baseCost * garmentMarkup + printCost;
        total = finalUnitPrice * itemsCount;
      }

      subtotal += total;

      processedItems.push({
        groupName: item.groupName || 'Group 1',
        category: item.category || null,
        itemNumber: item.itemNumber || null,
        color: item.color || null,
        description: item.description || null,
        baseCost,
        sizeBreakdown: breakdown,
        itemsCount,
        markupPrice,
        matrixId,
        matrixColumn,
        printCost,
        unitPrice: finalUnitPrice,
        isTaxed: !!item.isTaxed,
        total,
        imprintType: item.imprintType || null,
        mockups: item.mockups || [],
      });
    }

    const taxAmount = (subtotal - discountVal) * (taxRateVal / 100);
    const calculatedTotal = subtotal - discountVal + taxAmount;
    const total =
      quoteTotalOverride !== undefined &&
      quoteTotalOverride !== null &&
      Number(quoteTotalOverride) > 0
        ? Number(quoteTotalOverride)
        : calculatedTotal;

    return {
      subtotal,
      taxAmount,
      total,
      processedItems,
    };
  }

  private formatGroupedResponse(quote: any) {
    if (!quote || !quote.lineItems) {
      return quote;
    }

    const groupsMap = new Map<string, any[]>();
    for (const item of quote.lineItems) {
      const groupName = item.groupName || 'Group 1';
      if (!groupsMap.has(groupName)) {
        groupsMap.set(groupName, []);
      }
      groupsMap.get(groupName)!.push(item);
    }

    const groups = Array.from(groupsMap.entries()).map(([name, items]) => ({
      name,
      lineItems: items,
    }));

    return {
      ...quote,
      groups,
    };
  }

  async calculatePreview(dto: CalculateQuoteDto) {
    const lineItems = this.normalizeLineItems(dto);
    const { subtotal, taxAmount, total, processedItems } =
      await this.calculateTotals(
        lineItems,
        dto.discount || 0,
        dto.taxRate || 7.0,
        dto.total,
      );

    const groupsMap = new Map<string, any[]>();
    for (const item of processedItems) {
      const groupName = item.groupName || 'Group 1';
      if (!groupsMap.has(groupName)) {
        groupsMap.set(groupName, []);
      }
      groupsMap.get(groupName)!.push(item);
    }

    const groups = Array.from(groupsMap.entries()).map(([name, items]) => ({
      name,
      lineItems: items,
    }));

    return {
      subtotal,
      discount: dto.discount || 0,
      taxRate: dto.taxRate || 7.0,
      taxAmount,
      total,
      groups,
    };
  }

  async refreshPricingExisting(id: string, dto?: UpdateQuoteDto) {
    const existing = await this.findOne(id);
    let lineItems = dto ? this.normalizeLineItems(dto) : [];

    if (lineItems.length === 0 && existing.lineItems) {
      lineItems = existing.lineItems.map((item) => ({
        groupName: item.groupName,
        category: item.category,
        itemNumber: item.itemNumber,
        color: item.color,
        description: item.description,
        baseCost: Number(item.baseCost),
        sizeBreakdown: item.sizeBreakdown || null,
        markupPrice: Number(item.markupPrice),
        matrixId: item.matrixId,
        matrixColumn: item.matrixColumn,
        printCost: Number(item.printCost),
        unitPrice: Number(item.unitPrice),
        isTaxed: item.isTaxed,
        total: Number(item.total),
        imprintType: item.imprintType,
      }));
    }

    const discount =
      dto?.discount !== undefined ? dto.discount : Number(existing.discount);
    const taxRate =
      dto?.taxRate !== undefined ? dto.taxRate : Number(existing.taxRate);
    const quoteTotalOverride =
      dto?.total !== undefined ? dto.total : Number(existing.total);

    const { subtotal, taxAmount, total, processedItems } =
      await this.calculateTotals(
        lineItems,
        discount,
        taxRate,
        quoteTotalOverride,
      );

    const updatedQuote = await this.prisma.$transaction(async (tx) => {
      await tx.quoteLineItem.deleteMany({ where: { quoteId: id } });

      return tx.quote.update({
        where: { id },
        data: {
          subtotal,
          discount,
          taxRate,
          taxAmount,
          total,
          lineItems: {
            create: processedItems.map((item) => ({
              groupName: item.groupName,
              category: item.category,
              itemNumber: item.itemNumber,
              color: item.color,
              description: item.description,
              baseCost: item.baseCost,
              sizeBreakdown: item.sizeBreakdown || undefined,
              itemsCount: item.itemsCount,
              markupPrice: item.markupPrice,
              matrixId: item.matrixId,
              matrixColumn: item.matrixColumn,
              printCost: item.printCost,
              unitPrice: item.unitPrice,
              isTaxed: item.isTaxed,
              total: item.total,
              imprintType: item.imprintType,
              mockups: item.mockups,
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
    });

    return this.formatGroupedResponse(updatedQuote);
  }

  async create(dto: CreateQuoteDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer) {
      throw new NotFoundException(
        `Customer with ID ${dto.customerId} not found`,
      );
    }

    const rep = await this.prisma.user.findUnique({
      where: { userId: dto.repId },
    });
    if (!rep) {
      throw new NotFoundException(
        `Representative User with ID ${dto.repId} not found`,
      );
    }

    const quoteNumber = await this.generateNextQuoteNumber();
    const lineItemsInput = this.normalizeLineItems(dto);
    const { subtotal, taxAmount, total, processedItems } =
      await this.calculateTotals(
        lineItemsInput,
        dto.discount || 0,
        dto.taxRate || 7.0,
        dto.total,
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
            category: item.category,
            itemNumber: item.itemNumber,
            color: item.color,
            description: item.description,
            baseCost: item.baseCost,
            sizeBreakdown: item.sizeBreakdown || undefined,
            itemsCount: item.itemsCount,
            markupPrice: item.markupPrice,
            matrixId: item.matrixId,
            matrixColumn: item.matrixColumn,
            printCost: item.printCost,
            unitPrice: item.unitPrice,
            isTaxed: item.isTaxed,
            total: item.total,
            imprintType: item.imprintType,
            mockups: item.mockups,
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

    return this.formatGroupedResponse(quote);
  }

  async findAll(queryOrStatus?: any, legacySearch?: string) {
    let page = 1;
    let limit = 10;
    let search: string | undefined;
    let status: any;

    if (typeof queryOrStatus === 'object' && queryOrStatus !== null) {
      page = queryOrStatus.page || 1;
      limit = queryOrStatus.limit || 10;
      search = queryOrStatus.search;
      status = queryOrStatus.status;
    } else {
      status = queryOrStatus;
      search = legacySearch;
    }

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

    const formattedData = data.map((quote) =>
      this.formatGroupedResponse(quote),
    );

    return {
      data: formattedData,
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
    return this.formatGroupedResponse(quote);
  }

  async update(id: string, dto: UpdateQuoteDto) {
    const existing = await this.findOne(id);

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

    const lineItemsInput = this.normalizeLineItems(dto);
    const hasLineItemUpdates = lineItemsInput.length > 0;

    let updatedTotals: {
      subtotal?: number;
      taxAmount?: number;
      total?: number;
      processedItems?: CalcLineItemOutput[];
    } = {};

    const discount =
      dto.discount !== undefined ? dto.discount : Number(existing.discount);
    const taxRate =
      dto.taxRate !== undefined ? dto.taxRate : Number(existing.taxRate);
    const quoteTotalOverride =
      dto.total !== undefined ? dto.total : Number(existing.total);

    if (hasLineItemUpdates) {
      updatedTotals = await this.calculateTotals(
        lineItemsInput,
        discount,
        taxRate,
        quoteTotalOverride,
      );
    } else if (
      dto.discount !== undefined ||
      dto.taxRate !== undefined ||
      dto.total !== undefined
    ) {
      const existingInputs: CalcLineItemInput[] = existing.lineItems.map(
        (item: any) => ({
          groupName: item.groupName,
          category: item.category,
          itemNumber: item.itemNumber,
          color: item.color,
          description: item.description,
          baseCost: Number(item.baseCost),
          sizeBreakdown: item.sizeBreakdown || null,
          markupPrice: Number(item.markupPrice),
          matrixId: item.matrixId,
          matrixColumn: item.matrixColumn,
          printCost: Number(item.printCost),
          unitPrice: Number(item.unitPrice),
          isTaxed: item.isTaxed,
          total: Number(item.total),
          imprintType: item.imprintType,
        }),
      );

      updatedTotals = await this.calculateTotals(
        existingInputs,
        discount,
        taxRate,
        quoteTotalOverride,
      );
    }

    const updatedQuote = await this.prisma.$transaction(async (tx) => {
      if (hasLineItemUpdates) {
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
            hasLineItemUpdates && updatedTotals.processedItems
              ? {
                  create: updatedTotals.processedItems.map(
                    (item: CalcLineItemOutput) => ({
                      groupName: item.groupName,
                      category: item.category,
                      itemNumber: item.itemNumber,
                      color: item.color,
                      description: item.description,
                      baseCost: item.baseCost,
                      sizeBreakdown: item.sizeBreakdown || undefined,
                      itemsCount: item.itemsCount,
                      markupPrice: item.markupPrice,
                      matrixId: item.matrixId,
                      matrixColumn: item.matrixColumn,
                      printCost: item.printCost,
                      unitPrice: item.unitPrice,
                      isTaxed: item.isTaxed,
                      total: item.total,
                      imprintType: item.imprintType,
                      mockups: item.mockups,
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

    return this.formatGroupedResponse(updatedQuote);
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

    return this.formatGroupedResponse(quote);
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

    const fmt = (val: any) => `$${parseFloat(String(val)).toFixed(2)}`;

    const context = {
      customerName: `${customer.firstName} ${customer.lastName}`,
      quoteNumber: quote.quoteNumber,
      poNumber: quote.poNumber ?? null,
      dueDate,
      deliveryMethod: quote.deliveryMethod ?? null,
      subtotal: fmt(quote.subtotal),
      discount: Number(quote.discount) > 0 ? fmt(quote.discount) : null,
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

    const fmt = (val: any) => `$${parseFloat(String(val)).toFixed(2)}`;

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
