import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PriceMatricsService } from 'src/modules/price-matrics/price-matrics.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  createTestPrisma,
  cleanupTest,
  seedPriceMatrix,
  seedPriceTier,
} from '../setup/test-helpers';

describe('PriceMatricsService (integration)', () => {
  let module: TestingModule;
  let service: PriceMatricsService;
  let prisma: PrismaClient;
  const priceMatrixIds: string[] = [];
  const priceTierIds: string[] = [];

  beforeAll(async () => {
    prisma = createTestPrisma();

    module = await Test.createTestingModule({
      providers: [
        PriceMatricsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<PriceMatricsService>(PriceMatricsService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await module.close();
  });

  afterEach(async () => {
    await cleanupTest(prisma, { priceMatrixIds, priceTierIds });
    priceMatrixIds.length = 0;
    priceTierIds.length = 0;
  });

  describe('create & findOne', () => {
    it('should create price matrix and nested tiers in the database', async () => {
      const matrix = await service.create({
        name: 'Bulk Tier Pricing',
        priceType: 'markup',
        priceTiers: [
          { quantity: 10, basePrice: 20.0 as any, markup: 5.0 as any },
          { quantity: 50, basePrice: 18.0 as any, markup: 4.0 as any },
        ],
      });

      priceMatrixIds.push(matrix.priceMatrixId);
      for (const tier of matrix.priceTiers) {
        priceTierIds.push(tier.priceTierId);
      }

      expect(matrix.priceMatrixId).toBeDefined();
      expect(matrix.name).toBe('Bulk Tier Pricing');
      expect(matrix.priceTiers).toHaveLength(2);

      const found = await service.findOne(matrix.priceMatrixId);
      expect(found.priceTiers[0].quantity).toBe(10);
    });

    it('should throw NotFoundException on non-existent matrix id', async () => {
      await expect(
        service.findOne('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update & remove', () => {
    it('should update matrix details successfully', async () => {
      const seeded = await seedPriceMatrix(prisma);
      priceMatrixIds.push(seeded.priceMatrixId);

      const updated = await service.update(seeded.priceMatrixId, {
        name: 'New Custom Matrix Name',
      });
      expect(updated.name).toBe('New Custom Matrix Name');
    });

    it('should cascadingly delete all tiers when parent matrix is deleted', async () => {
      const seeded = await seedPriceMatrix(prisma);
      priceMatrixIds.push(seeded.priceMatrixId);

      const tier = await seedPriceTier(prisma, seeded.priceMatrixId);
      priceTierIds.push(tier.priceTierId);

      const result = await service.remove(seeded.priceMatrixId);
      expect(result.priceMatrixId).toBe(seeded.priceMatrixId);

      // Verify cascading tier delete
      const dbTier = await prisma.priceTier.findUnique({
        where: { priceTierId: tier.priceTierId },
      });
      expect(dbTier).toBeNull();
    });
  });

  describe('Tiers mutations', () => {
    it('should add, update, and remove single price tiers successfully', async () => {
      const seeded = await seedPriceMatrix(prisma);
      priceMatrixIds.push(seeded.priceMatrixId);

      // Add tier
      const tier = await service.addTier(seeded.priceMatrixId, {
        quantity: 100,
        basePrice: 12.5 as any,
        markup: 3.5 as any,
      });
      priceTierIds.push(tier.priceTierId);
      expect(tier.quantity).toBe(100);

      // Update tier
      const updated = await service.updateTier(tier.priceTierId, {
        quantity: 120,
        basePrice: 11.0 as any,
        markup: 3.0 as any,
      });
      expect(updated.quantity).toBe(120);

      // Remove tier
      const remResult = await service.removeTier(tier.priceTierId);
      expect(remResult.priceTierId).toBe(tier.priceTierId);

      const dbTier = await prisma.priceTier.findUnique({
        where: { priceTierId: tier.priceTierId },
      });
      expect(dbTier).toBeNull();
    });
  });
});
