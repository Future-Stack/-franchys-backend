import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { QuoteService } from 'src/modules/quote/quote.service';
import { JobService } from 'src/modules/job/job.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  createTestPrisma,
  seedCustomer,
  seedUser,
  seedQuote,
  cleanupTest,
} from '../setup/test-helpers';

// ─── Integration Test: QuoteService ──────────────────────────────────────────
// Uses a real Neon PostgreSQL test database. Each describe block cleans up
// after itself via the cleanupTest() helper.

describe('QuoteService (integration)', () => {
  let module: TestingModule;
  let service: QuoteService;
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = createTestPrisma();

    module = await Test.createTestingModule({
      providers: [
        QuoteService,
        JobService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<QuoteService>(QuoteService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await module.close();
  });

  // ─── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    let customerId: string;
    let repId: string;
    let createdQuoteId: string;

    beforeAll(async () => {
      const customer = await seedCustomer(prisma);
      const rep = await seedUser(prisma);
      customerId = customer.id;
      repId = rep.userId;
    });

    afterAll(async () => {
      await cleanupTest(prisma, {
        quoteIds: [createdQuoteId],
        customerIds: [customerId],
        userIds: [repId],
      });
    });

    it('should persist a quote and generate a quoteNumber', async () => {
      const quote = await service.create({
        customerId,
        repId,
        lineItems: [
          {
            groupName: 'Group 1',
            description: 'T-Shirt',
            unitPrice: 20,
            markupPrice: 10,
            sizeM: 10,
            sizeL: 5,
            sizeXL: 5,
            isTaxed: false,
            imprintType: 'Screen Print',
          },
        ],
        taxRate: 7,
      });

      createdQuoteId = quote.id;

      expect(quote.id).toBeDefined();
      expect(quote.quoteNumber).toMatch(/^Q-\d+$/);
      expect(Number(quote.subtotal)).toBeCloseTo(440);
      expect(Number(quote.total)).toBeCloseTo(470.8);
    });

    it('should throw NotFoundException for unknown customerId', async () => {
      await expect(
        service.create({
          customerId: '00000000-0000-0000-0000-000000000000',
          repId,
          lineItems: [],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for unknown repId', async () => {
      await expect(
        service.create({
          customerId,
          repId: '00000000-0000-0000-0000-000000000000',
          lineItems: [],
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── findAll ────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    let customerId: string;
    let repId: string;
    const quoteIds: string[] = [];

    beforeAll(async () => {
      const customer = await seedCustomer(prisma);
      const rep = await seedUser(prisma);
      customerId = customer.id;
      repId = rep.userId;

      const q1 = await seedQuote(prisma, customerId, repId, {
        status: 'DRAFT',
      });
      const q2 = await seedQuote(prisma, customerId, repId, {
        status: 'APPROVED',
      });
      quoteIds.push(q1.id, q2.id);
    });

    afterAll(async () => {
      await cleanupTest(prisma, {
        quoteIds,
        customerIds: [customerId],
        userIds: [repId],
      });
    });

    it('should return all quotes without filter', async () => {
      const result = await service.findAll();
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by status APPROVED', async () => {
      const result = await service.findAll('APPROVED');
      expect(result.every((q) => q.status === 'APPROVED')).toBe(true);
    });

    it('should filter by status DRAFT', async () => {
      const result = await service.findAll('DRAFT');
      expect(result.every((q) => q.status === 'DRAFT')).toBe(true);
    });
  });

  // ─── findOne ────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    let customerId: string;
    let repId: string;
    let quoteId: string;

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
        quoteIds: [quoteId],
        customerIds: [customerId],
        userIds: [repId],
      });
    });

    it('should return the quote with customer and lineItems', async () => {
      const result = await service.findOne(quoteId);
      expect(result.id).toBe(quoteId);
      expect(result.customer).toBeDefined();
      expect(result.lineItems.length).toBe(1);
    });

    it('should throw NotFoundException for missing id', async () => {
      await expect(
        service.findOne('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── update ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    let customerId: string;
    let repId: string;
    let quoteId: string;

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
        quoteIds: [quoteId],
        customerIds: [customerId],
        userIds: [repId],
      });
    });

    it('should update notes and persist to DB', async () => {
      const updated = await service.update(quoteId, { notes: 'Rush order' });
      expect(updated.notes).toBe('Rush order');

      // Verify persisted
      const fresh = await service.findOne(quoteId);
      expect(fresh.notes).toBe('Rush order');
    });

    it('should recalculate totals when discount changes', async () => {
      const updated = await service.update(quoteId, {
        discount: 40,
        lineItems: [
          {
            groupName: 'Group 1',
            description: 'T-Shirt',
            unitPrice: 20,
            markupPrice: 10,
            sizeM: 10,
            sizeL: 5,
            sizeXL: 5,
            isTaxed: false,
            imprintType: 'Screen Print',
          },
        ],
      });
      // subtotal=440, discount=40 → taxable=400, tax=7%×400=28, total=428
      expect(Number(updated.discount)).toBeCloseTo(40);
      expect(Number(updated.taxAmount)).toBeCloseTo(28);
      expect(Number(updated.total)).toBeCloseTo(428);
    });
  });

  // ─── updateStatusWithPermissionCheck ────────────────────────────────────────

  describe('updateStatusWithPermissionCheck', () => {
    let customerId: string;
    let adminUserId: string;
    let repUserId: string;
    let quoteId: string;
    let permissionId: string;
    const jobIds: string[] = [];

    beforeAll(async () => {
      const customer = await seedCustomer(prisma);
      const admin = await seedUser(prisma, { role: 'ADMIN' });
      const rep = await seedUser(prisma, { role: 'USER' });
      customerId = customer.id;
      adminUserId = admin.userId;
      repUserId = rep.userId;

      const quote = await seedQuote(prisma, customerId, adminUserId);
      quoteId = quote.id;

      // Give rep NO permission by default (no UserPermission row)
    });

    afterAll(async () => {
      await cleanupTest(prisma, {
        jobIds,
        quoteIds: [quoteId],
        permissionIds: permissionId ? [permissionId] : [],
        customerIds: [customerId],
        userIds: [adminUserId, repUserId],
      });
    });

    it('should allow ADMIN to approve without checking permissions', async () => {
      const result = await service.updateStatusWithPermissionCheck(
        quoteId,
        'APPROVED',
        {
          userId: adminUserId,
          email: 'admin@test.com',
          role: 'ADMIN',
        },
      );

      // Collect job created by auto-trigger
      const jobs = await prisma.job.findMany({ where: { quoteId } });
      jobs.forEach((j) => jobIds.push(j.id));

      expect(result.status).toBe('APPROVED');
    });

    it('should throw ForbiddenException if REP has no UserPermission row', async () => {
      await expect(
        service.updateStatusWithPermissionCheck(quoteId, 'APPROVED', {
          userId: repUserId,
          email: 'rep@test.com',
          role: 'USER',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if canApproveQuotes=false', async () => {
      const perm = await prisma.userPermission.create({
        data: { userId: repUserId, canApproveQuotes: false },
      });
      permissionId = perm.userPermissionId;

      await expect(
        service.updateStatusWithPermissionCheck(quoteId, 'APPROVED', {
          userId: repUserId,
          email: 'rep@test.com',
          role: 'USER',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── remove ─────────────────────────────────────────────────────────────────

  describe('remove', () => {
    let customerId: string;
    let repId: string;
    let quoteId: string;

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
        customerIds: [customerId],
        userIds: [repId],
      });
    });

    it('should delete quote and cascade to lineItems', async () => {
      const result = await service.remove(quoteId);
      expect(result).toEqual({
        message: 'Quote deleted successfully',
        id: quoteId,
      });

      // Verify DB row is gone
      const row = await prisma.quote.findUnique({ where: { id: quoteId } });
      expect(row).toBeNull();

      // Verify lineItems cascade-deleted
      const items = await prisma.quoteLineItem.findMany({ where: { quoteId } });
      expect(items).toHaveLength(0);
    });

    it('should throw NotFoundException when quote does not exist', async () => {
      await expect(
        service.remove('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
