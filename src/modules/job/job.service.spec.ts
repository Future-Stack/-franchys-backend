import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { JobService } from './job.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { JobStatus } from './dto/job.dto';

// ─── Prisma Mock ─────────────────────────────────────────────────────────────

const mockPrisma = {
  job: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  jobStatusHistory: {
    create: jest.fn(),
  },
  quote: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(),
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const buildJob = (overrides: Record<string, unknown> = {}) => ({
  id: 'job-1',
  jobId: 'Q-1001',
  clientName: 'Acme Corp',
  description: 'T-Shirts (20 units)',
  status: JobStatus.QUOTE,
  dueDate: new Date('2026-09-01'),
  amount: 470.8,
  quoteId: 'quote-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  quote: null,
  ...overrides,
});

const buildQuote = (overrides: Record<string, unknown> = {}) => ({
  id: 'quote-1',
  quoteNumber: 'Q-1001',
  total: 470.8,
  dueDate: new Date('2026-09-01'),
  customer: { firstName: 'John', lastName: 'Doe', companyName: null },
  lineItems: [{ description: 'T-Shirt', itemsCount: 20 }],
  ...overrides,
});

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('JobService', () => {
  let service: JobService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JobService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get<JobService>(JobService);
    jest.clearAllMocks();
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create a job with correct fields', async () => {
      const job = buildJob();
      mockPrisma.job.create.mockResolvedValue(job);

      const result = await service.create({
        jobId: 'Q-1001',
        clientName: 'Acme Corp',
        description: 'T-Shirts',
        dueDate: '2026-09-01',
        amount: 470.8,
        quoteId: 'quote-1',
      });

      expect(mockPrisma.job.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            jobId: 'Q-1001',
            clientName: 'Acme Corp',
            amount: 470.8,
          }),
        }),
      );
      expect(result).toEqual(job);
    });

    it('should default status to QUOTE when not provided', async () => {
      mockPrisma.job.create.mockResolvedValue(buildJob());

      await service.create({
        jobId: 'Q-1001',
        clientName: 'Acme Corp',
        description: 'T-Shirts',
        dueDate: '2026-09-01',
        amount: 100,
      });

      expect(mockPrisma.job.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: JobStatus.QUOTE }),
        }),
      );
    });
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return all jobs', async () => {
      const jobs = [buildJob(), buildJob({ id: 'job-2' })];
      mockPrisma.job.findMany.mockResolvedValue(jobs);
      mockPrisma.job.count.mockResolvedValue(2);

      const result = await service.findAll({});
      expect(result.data).toHaveLength(2);
    });

    it('should apply status filter', async () => {
      mockPrisma.job.findMany.mockResolvedValue([]);
      mockPrisma.job.count.mockResolvedValue(0);

      await service.findAll({ status: 'PRODUCTION' as any });

      expect(mockPrisma.job.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'PRODUCTION' }),
        }),
      );
    });

    it('should apply search filter across jobId, clientName, and description', async () => {
      mockPrisma.job.findMany.mockResolvedValue([]);
      mockPrisma.job.count.mockResolvedValue(0);

      await service.findAll({ search: 'Acme' });

      expect(mockPrisma.job.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ OR: expect.any(Array) }),
        }),
      );
    });
  });

  // ─── findOne ──────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return job when found', async () => {
      const job = buildJob();
      mockPrisma.job.findUnique.mockResolvedValue(job);

      const result = await service.findOne('job-1');
      expect(result).toEqual(job);
    });

    it('should throw NotFoundException when job not found', async () => {
      mockPrisma.job.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── update ───────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update job fields', async () => {
      mockPrisma.job.findUnique.mockResolvedValue(buildJob());
      const updatedJob = buildJob({
        clientName: 'New Corp',
        status: JobStatus.PRODUCTION,
      });
      mockPrisma.job.update.mockResolvedValue(updatedJob);

      const result = await service.update('job-1', {
        clientName: 'New Corp',
        status: JobStatus.PRODUCTION,
      });

      expect(mockPrisma.job.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'job-1' } }),
      );
      expect(result.clientName).toBe('New Corp');
    });

    it('should throw NotFoundException if job not found', async () => {
      mockPrisma.job.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing', { clientName: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── updateStatus ─────────────────────────────────────────────────────────

  describe('updateStatus', () => {
    it('should update job status and create status history', async () => {
      mockPrisma.job.findUnique.mockResolvedValue(buildJob());
      const updatedJob = buildJob({ status: JobStatus.COMPLETED });

      mockPrisma.$transaction.mockImplementation(async (cb: any) => {
        return cb({
          jobStatusHistory: {
            create: jest.fn().mockResolvedValue({}),
          },
          job: {
            update: jest.fn().mockResolvedValue(updatedJob),
          },
        });
      });

      const result = await service.updateStatus('job-1', {
        status: JobStatus.COMPLETED,
        note: 'Completed artwork proof',
      });

      expect(result.status).toBe(JobStatus.COMPLETED);
    });

    it('should throw NotFoundException if job not found', async () => {
      mockPrisma.job.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus('missing', {
          status: JobStatus.COMPLETED,
          note: 'Completed artwork proof',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── remove ───────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should delete job and return success message', async () => {
      mockPrisma.job.findUnique.mockResolvedValue(buildJob());
      mockPrisma.job.delete.mockResolvedValue({});

      const result = await service.remove('job-1');

      expect(mockPrisma.job.delete).toHaveBeenCalledWith({
        where: { id: 'job-1' },
      });
      expect(result).toEqual({
        message: 'Job deleted successfully',
        id: 'job-1',
      });
    });

    it('should throw NotFoundException if job does not exist', async () => {
      mockPrisma.job.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.job.delete).not.toHaveBeenCalled();
    });
  });

  // ─── createOrUpdateJobFromQuote ───────────────────────────────────────────

  describe('createOrUpdateJobFromQuote', () => {
    it('should throw NotFoundException if quote does not exist', async () => {
      mockPrisma.quote.findUnique.mockResolvedValue(null);

      await expect(
        service.createOrUpdateJobFromQuote('bad-quote'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create a new job if none exists for the quote', async () => {
      const quote = buildQuote();
      mockPrisma.quote.findUnique.mockResolvedValue(quote);
      mockPrisma.job.findFirst.mockResolvedValue(null);
      mockPrisma.job.create.mockResolvedValue(buildJob());

      await service.createOrUpdateJobFromQuote('quote-1');

      expect(mockPrisma.job.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            jobId: 'Q-1001',
            clientName: 'John Doe',
            quoteId: 'quote-1',
          }),
        }),
      );
    });

    it('should use companyName when available', async () => {
      const quote = buildQuote({
        customer: {
          firstName: 'John',
          lastName: 'Doe',
          companyName: 'Acme Corp',
        },
      });
      mockPrisma.quote.findUnique.mockResolvedValue(quote);
      mockPrisma.job.findFirst.mockResolvedValue(null);
      mockPrisma.job.create.mockResolvedValue(
        buildJob({ clientName: 'Acme Corp' }),
      );

      await service.createOrUpdateJobFromQuote('quote-1');

      expect(mockPrisma.job.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ clientName: 'Acme Corp' }),
        }),
      );
    });

    it('should update existing job when one already exists for the quote', async () => {
      const quote = buildQuote();
      const existingJob = buildJob({ id: 'job-existing' });
      mockPrisma.quote.findUnique.mockResolvedValue(quote);
      mockPrisma.job.findFirst.mockResolvedValue(existingJob);
      mockPrisma.job.update.mockResolvedValue(buildJob({ id: 'job-existing' }));

      await service.createOrUpdateJobFromQuote('quote-1');

      expect(mockPrisma.job.create).not.toHaveBeenCalled();
      expect(mockPrisma.job.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'job-existing' } }),
      );
    });

    it('should build description from first line item and total count', async () => {
      const quote = buildQuote({
        lineItems: [
          { description: 'T-Shirt', itemsCount: 10 },
          { description: 'Hat', itemsCount: 5 },
        ],
      });
      mockPrisma.quote.findUnique.mockResolvedValue(quote);
      mockPrisma.job.findFirst.mockResolvedValue(null);
      mockPrisma.job.create.mockResolvedValue(buildJob());

      await service.createOrUpdateJobFromQuote('quote-1');

      expect(mockPrisma.job.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            description: 'T-Shirt (15 units)',
          }),
        }),
      );
    });
  });
});
