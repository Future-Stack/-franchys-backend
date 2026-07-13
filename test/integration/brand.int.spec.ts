import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { BrandService } from 'src/modules/brand/brand.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  createTestPrisma,
  cleanupTest,
  seedBrand,
} from '../setup/test-helpers';

describe('BrandService (integration)', () => {
  let module: TestingModule;
  let service: BrandService;
  let prisma: PrismaClient;
  const brandIds: string[] = [];

  beforeAll(async () => {
    prisma = createTestPrisma();

    module = await Test.createTestingModule({
      providers: [
        BrandService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<BrandService>(BrandService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await module.close();
  });

  afterEach(async () => {
    await cleanupTest(prisma, { brandIds });
    brandIds.length = 0;
  });

  describe('create', () => {
    it('should persist a brand in the database', async () => {
      const name = `Brand-${Date.now()}`;
      const brand = await service.create({
        name,
        description: 'Quality Brand',
      });

      brandIds.push(brand.id);

      expect(brand.id).toBeDefined();
      expect(brand.name).toBe(name);
      expect(brand.description).toBe('Quality Brand');
      expect(brand.isDeleted).toBe(false);

      const dbBrand = await prisma.brand.findUnique({
        where: { id: brand.id },
      });
      expect(dbBrand).toBeDefined();
    });

    it('should throw ConflictException on duplicate name', async () => {
      const name = `DupBrand-${Date.now()}`;
      const b1 = await seedBrand(prisma, { name });
      brandIds.push(b1.id);

      await expect(
        service.create({
          name,
          description: 'Dup description',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return only active brands', async () => {
      const b1 = await seedBrand(prisma, { isDeleted: false });
      const b2 = await seedBrand(prisma, { isDeleted: true });
      brandIds.push(b1.id, b2.id);

      const result = await service.findAll();
      expect(result.some((b) => b.id === b1.id)).toBe(true);
      expect(result.some((b) => b.id === b2.id)).toBe(false);
    });
  });

  describe('findOne', () => {
    it('should return brand by ID', async () => {
      const seeded = await seedBrand(prisma);
      brandIds.push(seeded.id);

      const result = await service.findOne(seeded.id);
      expect(result.id).toBe(seeded.id);
    });

    it('should throw NotFoundException for invalid ID', async () => {
      await expect(
        service.findOne('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for soft-deleted brand ID', async () => {
      const seeded = await seedBrand(prisma, { isDeleted: true });
      brandIds.push(seeded.id);

      await expect(service.findOne(seeded.id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should successfully update fields', async () => {
      const seeded = await seedBrand(prisma, { name: 'Original' });
      brandIds.push(seeded.id);

      const updated = await service.update(seeded.id, { name: 'Updated' });
      expect(updated.name).toBe('Updated');

      const dbBrand = await prisma.brand.findUnique({
        where: { id: seeded.id },
      });
      expect(dbBrand?.name).toBe('Updated');
    });

    it('should throw ConflictException on name conflict', async () => {
      const name1 = `conf-brand1-${Date.now()}`;
      const name2 = `conf-brand2-${Date.now()}`;

      const b1 = await seedBrand(prisma, { name: name1 });
      const b2 = await seedBrand(prisma, { name: name2 });
      brandIds.push(b1.id, b2.id);

      await expect(service.update(b1.id, { name: name2 })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('should soft-delete brand (set isDeleted=true)', async () => {
      const seeded = await seedBrand(prisma);
      brandIds.push(seeded.id);

      const result = await service.remove(seeded.id);
      expect(result.id).toBe(seeded.id);

      const dbBrand = await prisma.brand.findUnique({
        where: { id: seeded.id },
      });
      expect(dbBrand?.isDeleted).toBe(true);
    });
  });
});
