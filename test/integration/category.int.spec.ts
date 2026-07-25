import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CategoryService } from 'src/modules/category/category.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  createTestPrisma,
  cleanupTest,
  seedCategory,
} from '../setup/test-helpers';

describe('CategoryService (integration)', () => {
  let module: TestingModule;
  let service: CategoryService;
  let prisma: PrismaClient;
  const categoryIds: string[] = [];

  beforeAll(async () => {
    prisma = createTestPrisma();

    module = await Test.createTestingModule({
      providers: [
        CategoryService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await module.close();
  });

  afterEach(async () => {
    await cleanupTest(prisma, { categoryIds });
    categoryIds.length = 0;
  });

  describe('create', () => {
    it('should persist a category in the database', async () => {
      const name = `Category-${Date.now()}`;
      const category = await service.create({
        name,
        description: 'Quality Products Category',
      });

      categoryIds.push(category.id);

      expect(category.id).toBeDefined();
      expect(category.name).toBe(name);
      expect(category.description).toBe('Quality Products Category');
      expect(category.isDeleted).toBe(false);

      const dbCategory = await prisma.category.findUnique({
        where: { id: category.id },
      });
      expect(dbCategory).toBeDefined();
    });

    it('should throw ConflictException on duplicate name', async () => {
      const name = `DupCategory-${Date.now()}`;
      const c1 = await seedCategory(prisma, { name });
      categoryIds.push(c1.id);

      await expect(
        service.create({
          name,
          description: 'Dup description',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return only active categories', async () => {
      const c1 = await seedCategory(prisma, { isDeleted: false });
      const c2 = await seedCategory(prisma, { isDeleted: true });
      categoryIds.push(c1.id, c2.id);

      const result = await service.findAll();
      expect(result.data.some((c) => c.id === c1.id)).toBe(true);
      expect(result.data.some((c) => c.id === c2.id)).toBe(false);
    });
  });

  describe('findOne', () => {
    it('should return category by ID', async () => {
      const seeded = await seedCategory(prisma);
      categoryIds.push(seeded.id);

      const result = await service.findOne(seeded.id);
      expect(result.id).toBe(seeded.id);
    });

    it('should throw NotFoundException for invalid ID', async () => {
      await expect(
        service.findOne('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for soft-deleted category ID', async () => {
      const seeded = await seedCategory(prisma, { isDeleted: true });
      categoryIds.push(seeded.id);

      await expect(service.findOne(seeded.id)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should successfully update fields', async () => {
      const seeded = await seedCategory(prisma, { name: 'Original' });
      categoryIds.push(seeded.id);

      const updated = await service.update(seeded.id, { name: 'Updated' });
      expect(updated.name).toBe('Updated');

      const dbCategory = await prisma.category.findUnique({
        where: { id: seeded.id },
      });
      expect(dbCategory?.name).toBe('Updated');
    });

    it('should throw ConflictException on name conflict', async () => {
      const name1 = `conf-category1-${Date.now()}`;
      const name2 = `conf-category2-${Date.now()}`;

      const c1 = await seedCategory(prisma, { name: name1 });
      const c2 = await seedCategory(prisma, { name: name2 });
      categoryIds.push(c1.id, c2.id);

      await expect(service.update(c1.id, { name: name2 })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('should soft-delete category (set isDeleted=true)', async () => {
      const seeded = await seedCategory(prisma);
      categoryIds.push(seeded.id);

      const result = await service.remove(seeded.id);
      expect(result.id).toBe(seeded.id);

      const dbCategory = await prisma.category.findUnique({
        where: { id: seeded.id },
      });
      expect(dbCategory?.isDeleted).toBe(true);
    });
  });
});
