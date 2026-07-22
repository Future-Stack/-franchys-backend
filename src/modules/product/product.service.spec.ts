import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ProductService } from './product.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

const mockPrisma = {
  product: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  category: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  brand: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  productColor: {
    findUnique: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockCloudinaryService = {
  uploadMultipleFiles: jest.fn(),
};

describe('ProductService (unit)', () => {
  let service: ProductService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CloudinaryService, useValue: mockCloudinaryService },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
  });

  describe('create', () => {
    const dto = {
      productName: 'T-Shirt',
      itemNo: 'TS-01',
      price: 19.99 as any,
      categoryId: 'cat-1',
      brandId: 'brand-1',
      colors: [{ name: 'Blue', code: '#0000FF' }],
    };

    it('should create a product with colors and images successfully', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({ id: 'cat-1' });
      mockPrisma.brand.findUnique.mockResolvedValue({ id: 'brand-1' });

      const mockFiles = [{ filename: 'pic.jpg' }] as any;
      mockCloudinaryService.uploadMultipleFiles.mockResolvedValue([
        'http://cloud.com/pic.jpg',
      ]);
      mockPrisma.product.create.mockResolvedValue({
        id: 'prod-1',
        productName: dto.productName,
        images: ['http://cloud.com/pic.jpg'],
      });

      const result = await service.create(dto, mockFiles);

      expect(mockCloudinaryService.uploadMultipleFiles).toHaveBeenCalledWith(
        mockFiles,
      );
      expect(mockPrisma.product.create).toHaveBeenCalledWith({
        data: {
          productName: 'T-Shirt',
          itemNo: 'TS-01',
          price: 19.99,
          categoryId: 'cat-1',
          brandId: 'brand-1',
          images: ['http://cloud.com/pic.jpg'],
          colors: { create: [{ name: 'Blue', code: '#0000FF' }] },
        },
        include: { colors: true, category: true, brand: true },
      });
      expect(result.id).toBe('prod-1');
    });

    it('should dynamically create category and brand when "other" is passed', async () => {
      mockPrisma.category.findFirst.mockResolvedValue(null);
      mockPrisma.category.create.mockResolvedValue({
        id: 'new-cat-id',
        name: 'Custom Category',
      });
      mockPrisma.brand.findFirst.mockResolvedValue(null);
      mockPrisma.brand.create.mockResolvedValue({
        id: 'new-brand-id',
        name: 'Other',
      });

      mockPrisma.product.create.mockResolvedValue({
        id: 'prod-2',
        productName: 'Custom Product',
      });

      const customDto = {
        productName: 'Custom Product',
        price: 49.99 as any,
        categoryId: 'other',
        categoryName: 'Custom Category',
        brandId: 'other',
      };

      const result = await service.create(customDto);

      expect(mockPrisma.category.create).toHaveBeenCalledWith({
        data: { name: 'Custom Category' },
      });
      expect(mockPrisma.brand.create).toHaveBeenCalledWith({
        data: { name: 'Other' },
      });
      expect(mockPrisma.product.create).toHaveBeenCalledWith({
        data: {
          productName: 'Custom Product',
          price: 49.99,
          categoryId: 'new-cat-id',
          brandId: 'new-brand-id',
          images: [],
          colors: undefined,
        },
        include: { colors: true, category: true, brand: true },
      });
      expect(result.id).toBe('prod-2');
    });
  });

  describe('findAll', () => {
    it('should return active products', async () => {
      mockPrisma.product.findMany.mockResolvedValue([
        { id: '1', productName: 'Tee' },
      ]);
      mockPrisma.product.count.mockResolvedValue(1);

      const result = await service.findAll();

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: { isDeleted: false },
        skip: 0,
        take: 10,
        include: { colors: true, category: true, brand: true },
        orderBy: { createdAt: 'desc' },
      });
      expect(result.data).toEqual([{ id: '1', productName: 'Tee' }]);
    });
  });

  describe('findOne', () => {
    it('should return product by id', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        isDeleted: false,
      });

      const result = await service.findOne('prod-1');

      expect(result.id).toBe('prod-1');
    });

    it('should throw NotFoundException if missing', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(service.findOne('bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addColor', () => {
    it('should add color successfully to an existing product', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        isDeleted: false,
      });
      mockPrisma.productColor.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockResolvedValue([
        { id: 'col-1', name: 'Red', productId: 'prod-1' },
      ]);

      const result = await service.addColor('prod-1', {
        name: 'Red',
        code: '#FF0000',
      });

      expect(mockPrisma.productColor.findUnique).toHaveBeenCalled();
      expect(result).toEqual({ id: 'col-1', name: 'Red', productId: 'prod-1' });
    });

    it('should throw ConflictException on duplicate color name', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        isDeleted: false,
      });
      mockPrisma.productColor.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.addColor('prod-1', { name: 'Red' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('updateColor', () => {
    it('should update specific product color', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        isDeleted: false,
      });
      mockPrisma.productColor.findUnique.mockResolvedValue({
        id: 'col-1',
        productId: 'prod-1',
      });
      mockPrisma.productColor.update.mockResolvedValue({
        id: 'col-1',
        name: 'Green',
      });

      const result = await service.updateColor('prod-1', 'col-1', {
        name: 'Green',
      });

      expect(mockPrisma.productColor.update).toHaveBeenCalledWith({
        where: { id: 'col-1' },
        data: { name: 'Green' },
      });
      expect(result.name).toBe('Green');
    });
  });

  describe('removeColor', () => {
    it('should delete a specific color from product', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        isDeleted: false,
      });
      mockPrisma.productColor.findUnique.mockResolvedValue({
        id: 'col-1',
        productId: 'prod-1',
      });
      mockPrisma.productColor.delete.mockResolvedValue({});

      const result = await service.removeColor('prod-1', 'col-1');

      expect(mockPrisma.productColor.delete).toHaveBeenCalledWith({
        where: { id: 'col-1' },
      });
      expect(result.message).toBe('Color removed successfully');
    });
  });
});
