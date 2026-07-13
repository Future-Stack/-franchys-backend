import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { JobService } from 'src/modules/job/job.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { JobStatus } from 'src/modules/job/dto/job.dto';
import {
  createTestPrisma,
  seedCustomer,
  seedUser,
  seedQuote,
  seedJob,
  cleanupTest,
} from '../setup/test-helpers';

// ─── Integration Test: JobService ─────────────────────────────────────────────

describe('JobService (integration)', () => {
  let module: TestingModule;
  let service: JobService;
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = createTestPrisma();

    module = await Test.createTestingModule({
      providers: [JobService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<JobService>(JobService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await module.close();
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    const jobIds: string[] = [];

    afterAll(async () => {
      await cleanupTest(prisma, { jobIds });
    });

    it('should persist a job with QUOTE default status', async () => {
      const job = await service.create({
        jobId: `Q-INT-${Date.now()}`,
        clientName: 'Acme Corp',
        description: 'T-Shirts (50 units)',
        dueDate: '2026-12-01',
        amount: 1500,
      });

      jobIds.push(job.id);

      expect(job.id).toBeDefined();
      expect(job.status).toBe(JobStatus.QUOTE);
      expect(Number(job.amount)).toBeCloseTo(1500);
    });

    it('should persist a job with explicit status', async () => {
      const job = await service.create({
        jobId: `Q-INT-${Date.now()}-2`,
        clientName: 'Beta Corp',
        description: 'Hats (30 units)',
        dueDate: '2026-11-15',
        amount: 900,
        status: JobStatus.APPROVED,
      });

      jobIds.push(job.id);
      expect(job.status).toBe(JobStatus.APPROVED);
    });
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    const jobIds: string[] = [];

    beforeAll(async () => {
      const j1 = await seedJob(prisma, { status: 'QUOTE' });
      const j2 = await seedJob(prisma, { status: 'PRODUCTION' });
      const j3 = await seedJob(prisma, { clientName: 'SearchTarget Corp' });
      jobIds.push(j1.id, j2.id, j3.id);
    });

    afterAll(async () => {
      await cleanupTest(prisma, { jobIds });
    });

    it('should return jobs without filter', async () => {
      const result = await service.findAll();
      expect(result.length).toBeGreaterThanOrEqual(3);
    });

    it('should filter by status PRODUCTION', async () => {
      const result = await service.findAll('PRODUCTION');
      expect(result.every((j) => j.status === 'PRODUCTION')).toBe(true);
    });

    it('should search by clientName', async () => {
      const result = await service.findAll(undefined, 'SearchTarget');
      expect(result.some((j) => j.clientName === 'SearchTarget Corp')).toBe(
        true,
      );
    });
  });

  // ─── findOne ──────────────────────────────────────────────────────────────

  describe('findOne', () => {
    let jobId: string;

    beforeAll(async () => {
      const job = await seedJob(prisma);
      jobId = job.id;
    });

    afterAll(async () => {
      await cleanupTest(prisma, { jobIds: [jobId] });
    });

    it('should return the job when found', async () => {
      const result = await service.findOne(jobId);
      expect(result.id).toBe(jobId);
    });

    it('should throw NotFoundException for unknown id', async () => {
      await expect(
        service.findOne('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── updateStatus ─────────────────────────────────────────────────────────

  describe('updateStatus', () => {
    let jobId: string;

    beforeAll(async () => {
      const job = await seedJob(prisma);
      jobId = job.id;
    });

    afterAll(async () => {
      await cleanupTest(prisma, { jobIds: [jobId] });
    });

    it('should transition status through the workflow', async () => {
      const statuses = [
        JobStatus.APPROVED,
        JobStatus.ART,
        JobStatus.PRODUCTION,
        JobStatus.COMPLETED,
      ];

      for (const status of statuses) {
        const result = await service.updateStatus(jobId, status);
        expect(result.status).toBe(status);

        // Verify persisted
        const fresh = await service.findOne(jobId);
        expect(fresh.status).toBe(status);
      }
    });

    it('should throw NotFoundException for unknown id', async () => {
      await expect(
        service.updateStatus(
          '00000000-0000-0000-0000-000000000000',
          JobStatus.COMPLETED,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── createOrUpdateJobFromQuote ───────────────────────────────────────────

  describe('createOrUpdateJobFromQuote', () => {
    let customerId: string;
    let repId: string;
    let quoteId: string;
    const jobIds: string[] = [];

    beforeAll(async () => {
      const customer = await seedCustomer(prisma);
      const rep = await seedUser(prisma);
      customerId = customer.id;
      repId = rep.userId;
      const quote = await seedQuote(prisma, customerId, repId);
      quoteId = quote.id;
    });

    afterAll(async () => {
      await cleanupTest(prisma, {
        jobIds,
        quoteIds: [quoteId],
        customerIds: [customerId],
        userIds: [repId],
      });
    });

    it('should create a Job from the Quote on first call', async () => {
      const job = await service.createOrUpdateJobFromQuote(quoteId);
      jobIds.push(job.id);

      expect(job.quoteId).toBe(quoteId);
      expect(job.clientName).toBe('John Doe'); // firstName + lastName from seedCustomer
      expect(job.description).toContain('T-Shirt');
      expect(Number(job.amount)).toBeCloseTo(470.8);
    });

    it('should update the existing Job on second call (not create a duplicate)', async () => {
      const updated = await service.createOrUpdateJobFromQuote(quoteId);

      // Must be the same job row, not a new one
      expect(updated.id).toBe(jobIds[0]);
    });

    it('should throw NotFoundException for unknown quoteId', async () => {
      await expect(
        service.createOrUpdateJobFromQuote(
          '00000000-0000-0000-0000-000000000000',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── remove ───────────────────────────────────────────────────────────────

  describe('remove', () => {
    let jobId: string;

    beforeAll(async () => {
      const job = await seedJob(prisma);
      jobId = job.id;
    });

    it('should delete the job and return success message', async () => {
      const result = await service.remove(jobId);
      expect(result).toEqual({
        message: 'Job deleted successfully',
        id: jobId,
      });

      const row = await prisma.job.findUnique({ where: { id: jobId } });
      expect(row).toBeNull();
    });

    it('should throw NotFoundException when job does not exist', async () => {
      await expect(
        service.remove('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
