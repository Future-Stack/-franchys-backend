import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { PrismaClient, ProductColor } from '@prisma/client';
import { ProductService } from 'src/modules/product/product.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CloudinaryService } from 'src/modules/cloudinary/cloudinary.service';
import {
  createTestPrisma,
  cleanupTest,
  seedProduct,
  seedCategory,
  seedBrand,
} from '../setup/test-helpers';

describe('ProductService (integration)', () => {
  let module: TestingModule;
  let service: ProductService;
  let prisma: PrismaClient;
  const productIds: string[] = [];
  const categoryIds: string[] = [];
  const brandIds: string[] = [];

  beforeAll(async () => {
    prisma = createTestPrisma();

    module = await Test.createTestingModule({
      providers: [
        ProductService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: CloudinaryService,
          useValue: {
            uploadMultipleFiles: jest
              .fn()
              .mockResolvedValue(['http://cloud.com/img.jpg']),
          },
        },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await module.close();
  });

  afterEach(async () => {
    await cleanupTest(prisma, { productIds, categoryIds, brandIds });
    productIds.length = 0;
    categoryIds.length = 0;
    brandIds.length = 0;
  });

  describe('create', () => {
    it('should persist a product and nested colors in database', async () => {
      const cat = await seedCategory(prisma);
      const brand = await seedBrand(prisma);
      categoryIds.push(cat.id);
      brandIds.push(brand.id);

      const product = await service.create({
        productName: 'Cool Jacket',
        itemNo: `JK-${Date.now()}`,
        price: 89.99,
        categoryId: cat.id,
        brandId: brand.id,
        colors: [{ name: 'Black', code: '#000000' }],
      });

      productIds.push(product.id);

      expect(product.id).toBeDefined();
      expect(product.productName).toBe('Cool Jacket');
      expect(product.colors).toHaveLength(1);
      expect(product.colors[0].name).toBe('Black');
    });
  });

  describe('findAll', () => {
    it('should return active products only', async () => {
      const cat = await seedCategory(prisma);
      const brand = await seedBrand(prisma);
      categoryIds.push(cat.id);
      brandIds.push(brand.id);

      const p1 = await seedProduct(prisma, {
        categoryId: cat.id,
        brandId: brand.id,
        isDeleted: false,
      });
      const p2 = await seedProduct(prisma, {
        categoryId: cat.id,
        brandId: brand.id,
        isDeleted: true,
      });
      productIds.push(p1.id, p2.id);

      const result = await service.findAll();
      expect(result.data.some((p) => p.id === p1.id)).toBe(true);
      expect(result.data.some((p) => p.id === p2.id)).toBe(false);
    });
  });

  describe('colors sub-resource mutations', () => {
    it('should add, update, and remove colors for product', async () => {
      const cat = await seedCategory(prisma);
      const brand = await seedBrand(prisma);
      categoryIds.push(cat.id);
      brandIds.push(brand.id);

      const p = await seedProduct(prisma, {
        categoryId: cat.id,
        brandId: brand.id,
      });
      productIds.push(p.id);

      // Add color
      const col = (await service.addColor(p.id, {
        name: 'Yellow',
        code: '#FFFF00',
      })) as ProductColor;
      expect(col.name).toBe('Yellow');

      // Update color
      const updatedCol = await service.updateColor(p.id, col.id, {
        name: 'Yellow Gold',
      });
      expect(updatedCol.name).toBe('Yellow Gold');

      // Remove color
      const remResult = await service.removeColor(p.id, col.id);
      expect(remResult.message).toBe('Color removed successfully');
    });

    it('should throw ConflictException on duplicate color add', async () => {
      const cat = await seedCategory(prisma);
      const brand = await seedBrand(prisma);
      categoryIds.push(cat.id);
      brandIds.push(brand.id);

      const p = await seedProduct(prisma, {
        categoryId: cat.id,
        brandId: brand.id,
      });
      productIds.push(p.id);

      await service.addColor(p.id, { name: 'Cyan' });

      await expect(service.addColor(p.id, { name: 'Cyan' })).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
