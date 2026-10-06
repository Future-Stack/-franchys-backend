import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, JobStatus as PrismaJobStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateJobDto,
  UpdateJobDto,
  UpdateJobStatusDto,
  UpdateJobChecklistDto,
  JobStatus,
} from './dto/job.dto';

function formatSizeLabel(key: string): string {
  if (!key) return '—';
  if (key.startsWith('sizeAdult')) return key.replace('sizeAdult', '');
  if (key.startsWith('sizeYouth'))
    return 'Youth ' + key.replace('sizeYouth', '');
  if (key.startsWith('sizeToddler'))
    return 'Toddler ' + key.replace('sizeToddler', '');
  if (key.startsWith('sizeInfant'))
    return 'Infant ' + key.replace('sizeInfant', '');
  if (key.startsWith('size')) return key.replace('size', '');
  return key;
}

const DEFAULT_QC_ITEMS = [
  {
    id: 'specifications',
    label: 'All items produced according to specifications',
  },
  {
    id: 'artwork_placement',
    label: 'Artwork placement and alignment verified',
  },
  { id: 'color_matching', label: 'Color matching approved' },
  { id: 'size_breakdown', label: 'Size breakdown confirmed' },
  { id: 'final_inspection', label: 'Final inspection completed' },
];

@Injectable()
export class JobService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateJobDto) {
    return await this.prisma.job.create({
      data: {
        jobId: dto.jobId,
        clientName: dto.clientName,
        description: dto.description,
        status: dto.status || JobStatus.QUOTE,
        dueDate: new Date(dto.dueDate),
        amount: dto.amount,
        quoteId: dto.quoteId,
      },
    });
  }

  async findAll(queryOrStatus?: any, legacySearch?: string) {
    let page = 1;
    let limit = 10;
    let search: string | undefined;
    let status: any;
    let date: string | undefined;
    let amount: string | number | undefined;
    let sortBy: string | undefined;
    let sortOrder: 'asc' | 'desc' = 'desc';

    if (typeof queryOrStatus === 'object' && queryOrStatus !== null) {
      page = queryOrStatus.page || 1;
      limit = queryOrStatus.limit || 10;
      search = queryOrStatus.search;
      status = queryOrStatus.status;
      date = queryOrStatus.date;
      amount = queryOrStatus.amount;
      sortBy = queryOrStatus.sortBy;
      if (queryOrStatus.sortOrder) {
        const so = String(queryOrStatus.sortOrder).toLowerCase();
        if (so === 'asc' || so === 'desc') sortOrder = so;
      }
    } else {
      status = queryOrStatus;
      search = legacySearch;
    }

    const skip = (page - 1) * limit;

    const whereClause: Prisma.JobWhereInput = {};

    if (status) {
      whereClause.status = status;
    }

    if (search) {
      const orConditions: Prisma.JobWhereInput[] = [
        { jobId: { contains: search, mode: 'insensitive' } },
        { clientName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
      const searchNum = Number(search);
      if (!isNaN(searchNum) && search.trim() !== '') {
        orConditions.push({ amount: searchNum });
      }
      whereClause.OR = orConditions;
    }

    // Determine sorting & filtering for date & amount
    let orderBy: Prisma.JobOrderByWithRelationInput = { createdAt: 'desc' };

    // 1. Check if date is sort direction ('asc' | 'desc') or a date filter
    if (date) {
      const dateStr = String(date).trim().toLowerCase();
      if (dateStr === 'asc' || dateStr === 'desc') {
        orderBy = { dueDate: dateStr };
      } else {
        const parsedDate = new Date(date);
        if (!isNaN(parsedDate.getTime())) {
          const startOfDay = new Date(parsedDate);
          startOfDay.setUTCHours(0, 0, 0, 0);
          const endOfDay = new Date(parsedDate);
          endOfDay.setUTCHours(23, 59, 59, 999);
          whereClause.dueDate = {
            gte: startOfDay,
            lte: endOfDay,
          };
        }
      }
    }

    // 2. Check if amount is sort direction ('asc' | 'desc') or an amount filter
    if (amount !== undefined && amount !== null && amount !== '') {
      const amountStr = String(amount).trim().toLowerCase();
      if (amountStr === 'asc' || amountStr === 'desc') {
        orderBy = { amount: amountStr };
      } else {
        const parsedAmount = Number(amount);
        if (!isNaN(parsedAmount)) {
          whereClause.amount = parsedAmount;
        }
      }
    }

    // 3. Explicit sortBy overrides
    if (sortBy) {
      const sb = String(sortBy).trim().toLowerCase();
      if (sb === 'date' || sb === 'duedate') {
        orderBy = { dueDate: sortOrder };
      } else if (sb === 'amount') {
        orderBy = { amount: sortOrder };
      } else if (sb === 'createdat') {
        orderBy = { createdAt: sortOrder };
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.job.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          quote: true,
        },
        orderBy,
      }),
      this.prisma.job.count({ where: whereClause }),
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
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: {
        quote: {
          include: {
            customer: true,
            lineItems: true,
          },
        },
        history: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!job) {
      throw new NotFoundException(`Job card with ID ${id} not found`);
    }

    // Fallback: If quoteId was null, try linking via quoteNumber = job.jobId
    let quote = job.quote;
    if (!quote && job.jobId) {
      quote = await this.prisma.quote.findUnique({
        where: { quoteNumber: job.jobId },
        include: {
          customer: true,
          lineItems: true,
        },
      });
    }

    const completedItemIds: string[] = Array.isArray(job.completedItemIds)
      ? (job.completedItemIds as string[])
      : [];

    const savedQcList: string[] = Array.isArray(job.qcChecklist)
      ? (job.qcChecklist as string[])
      : [];

    // Calculate total units
    const totalUnits =
      quote?.lineItems?.reduce(
        (sum, item) => sum + (Number(item.itemsCount) || 0),
        0,
      ) || 0;

    // Aggregate mockups
    const mockups: string[] = Array.from(
      new Set(quote?.lineItems?.flatMap((item) => item.mockups || []) || []),
    );

    // Build production items
    const productionItems: Array<{
      id: string;
      lineItemId: string;
      description: string;
      color: string;
      size: string;
      quantity: number;
      imprintType: string;
      isDone: boolean;
    }> = [];

    if (quote?.lineItems && quote.lineItems.length > 0) {
      for (const lineItem of quote.lineItems) {
        const sizeBreakdown = (lineItem.sizeBreakdown || {}) as Record<
          string,
          any
        >;
        const sizeEntries = Object.entries(sizeBreakdown).filter(
          ([, qty]) => Number(qty) > 0,
        );

        if (sizeEntries.length > 0) {
          for (const [sizeKey, qty] of sizeEntries) {
            const rowId = `${lineItem.id}-${sizeKey}`;
            productionItems.push({
              id: rowId,
              lineItemId: lineItem.id,
              description: `${lineItem.description || 'Apparel Item'}${lineItem.color ? ` - ${lineItem.color}` : ''}`,
              color: lineItem.color || '—',
              size: formatSizeLabel(sizeKey),
              quantity: Number(qty),
              imprintType: lineItem.imprintType || 'Custom Printing',
              isDone: completedItemIds.includes(rowId),
            });
          }
        } else {
          // Line item without breakdown (e.g., setup fee, flat service)
          productionItems.push({
            id: lineItem.id,
            lineItemId: lineItem.id,
            description: lineItem.description || 'Custom Item',
            color: lineItem.color || '—',
            size: '—',
            quantity: Number(lineItem.itemsCount) || 1,
            imprintType: lineItem.imprintType || 'Custom Service',
            isDone: completedItemIds.includes(lineItem.id),
          });
        }
      }
    }

    // Build QC checklist
    const qcChecklist = DEFAULT_QC_ITEMS.map((qc) => ({
      ...qc,
      checked: savedQcList.includes(qc.id) || savedQcList.includes(qc.label),
    }));

    // Build specifications
    const specifications =
      quote?.lineItems?.map((item) => ({
        groupName: item.groupName,
        imprintType: item.imprintType || 'Custom Printing',
        category: item.category || 'General',
        description: item.description,
        color: item.color,
      })) || [];

    const notes = quote?.notes || job.description || '';

    return {
      ...job,
      quote,
      totalUnits,
      productionItems,
      mockups,
      specifications,
      qcChecklist,
      notes,
    };
  }

  async updateChecklist(id: string, dto: UpdateJobChecklistDto) {
    await this.findOne(id);

    const updateData: Prisma.JobUpdateInput = {};
    if (dto.completedItemIds !== undefined) {
      updateData.completedItemIds = dto.completedItemIds;
    }
    if (dto.qcChecklist !== undefined) {
      updateData.qcChecklist = dto.qcChecklist;
    }

    await this.prisma.job.update({
      where: { id },
      data: updateData,
    });

    return this.findOne(id);
  }

  async update(id: string, dto: UpdateJobDto) {
    await this.findOne(id);

    return await this.prisma.job.update({
      where: { id },
      data: {
        jobId: dto.jobId,
        clientName: dto.clientName,
        description: dto.description,
        status: dto.status ? (dto.status as PrismaJobStatus) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        amount: dto.amount,
        quoteId: dto.quoteId,
      },
      include: {
        quote: true,
        history: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async updateStatus(
    id: string,
    dtoOrStatus: UpdateJobStatusDto | JobStatus | string,
    user?: { email?: string; userId?: string },
  ) {
    const job = await this.findOne(id);
    const fromStatus = job.status;
    const toStatus = (
      typeof dtoOrStatus === 'object' && dtoOrStatus !== null
        ? dtoOrStatus.status
        : dtoOrStatus
    ) as PrismaJobStatus;
    const changedBy = user?.email || user?.userId || 'System Admin';

    return await this.prisma.$transaction(async (tx) => {
      await tx.jobStatusHistory.create({
        data: {
          jobId: id,
          fromStatus,
          toStatus,
          note:
            (typeof dtoOrStatus === 'object' &&
              dtoOrStatus !== null &&
              dtoOrStatus.note) ||
            '',
          changedBy,
        },
      });

      return tx.job.update({
        where: { id },
        data: { status: toStatus },
        include: {
          quote: true,
          history: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.job.delete({ where: { id } });
    return { message: 'Job deleted successfully', id };
  }

  async createOrUpdateJobFromQuote(quoteId: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        customer: true,
        lineItems: true,
      },
    });

    if (!quote) {
      throw new NotFoundException(`Quote with ID ${quoteId} not found`);
    }

    // Determine client name
    const clientName =
      quote.customer.companyName ||
      `${quote.customer.firstName} ${quote.customer.lastName}`;

    // Create description from line items
    let description = 'Custom Job';
    if (quote.lineItems.length > 0) {
      const firstItem = quote.lineItems[0];
      const count = quote.lineItems.reduce(
        (acc, curr) => acc + curr.itemsCount,
        0,
      );
      description = `${firstItem.description || 'Items'} (${count} units)`;
    }

    // Check if job already exists for this quote
    const existingJob = await this.prisma.job.findFirst({
      where: { quoteId },
    });

    if (existingJob) {
      return await this.prisma.job.update({
        where: { id: existingJob.id },
        data: {
          clientName,
          description,
          amount: quote.total,
          dueDate: quote.dueDate || new Date(),
        },
      });
    } else {
      return await this.prisma.job.create({
        data: {
          jobId: quote.quoteNumber,
          clientName,
          description,
          status: JobStatus.APPROVED,
          amount: quote.total,
          dueDate: quote.dueDate || new Date(),
          quoteId,
        },
      });
    }
  }
}
