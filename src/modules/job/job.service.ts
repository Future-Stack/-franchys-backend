import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, JobStatus as PrismaJobStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateJobDto, UpdateJobDto, JobStatus } from './dto/job.dto';
import { GetJobsDto } from './dto/get-jobs.dto';

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

  async findAll(query: GetJobsDto) {
    const { page = 1, limit = 10, search, status } = query;
    const skip = (page - 1) * limit;

    const whereClause: Prisma.JobWhereInput = {};

    if (status) {
      whereClause.status = status;
    }

    if (search) {
      whereClause.OR = [
        { jobId: { contains: search, mode: 'insensitive' } },
        { clientName: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.job.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          quote: true,
        },
        orderBy: { createdAt: 'desc' },
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
        quote: true,
      },
    });
    if (!job) {
      throw new NotFoundException(`Job card with ID ${id} not found`);
    }
    return job;
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
    });
  }

  async updateStatus(id: string, status: JobStatus) {
    await this.findOne(id);
    return await this.prisma.job.update({
      where: { id },
      data: { status },
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
