import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { BrandService } from './brand.service';
import { PrismaService } from 'src/prisma/prisma.service';

const mockPrisma = {
  brand: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn().mockResolvedValue(2),
    create: jest.fn(),
    update: jest.fn(),
  },
};

describe('BrandService (unit)', () => {
  let service: BrandService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BrandService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<BrandService>(BrandService);
  });

  describe('create', () => {
    const dto = { name: 'Nike', description: 'Just Do It' };

    it('should create a brand successfully', async () => {
      mockPrisma.brand.findUnique.mockResolvedValue(null);
      mockPrisma.brand.create.mockResolvedValue({
        id: 'brand-1',
        ...dto,
        isDeleted: false,
      });

      const result = await service.create(dto);

      expect(mockPrisma.brand.findUnique).toHaveBeenCalledWith({
        where: { name: dto.name },
      });
      expect(mockPrisma.brand.create).toHaveBeenCalledWith({ data: dto });
      expect(result.id).toBe('brand-1');
    });

    it('should throw ConflictException if brand name already exists', async () => {
      mockPrisma.brand.findUnique.mockResolvedValue({
        id: 'existing-id',
        ...dto,
      });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(mockPrisma.brand.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all active brands', async () => {
      const mockBrands = [
        { id: '1', name: 'Nike', isDeleted: false },
        { id: '2', name: 'Adidas', isDeleted: false },
      ];
      mockPrisma.brand.findMany.mockResolvedValue(mockBrands);
      mockPrisma.brand.count.mockResolvedValue(2);

      const result = await service.findAll();

      expect(mockPrisma.brand.findMany).toHaveBeenCalledWith({
        where: { isDeleted: false },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      expect(result.data).toEqual(mockBrands);
    });
  });

  describe('findOne', () => {
    it('should return a brand when found and not deleted', async () => {
      const mockBrand = { id: 'brand-1', name: 'Nike', isDeleted: false };
      mockPrisma.brand.findUnique.mockResolvedValue(mockBrand);

      const result = await service.findOne('brand-1');

      expect(mockPrisma.brand.findUnique).toHaveBeenCalledWith({
        where: { id: 'brand-1' },
      });
      expect(result).toEqual(mockBrand);
    });

    it('should throw NotFoundException when brand not found', async () => {
      mockPrisma.brand.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when brand is soft-deleted', async () => {
      mockPrisma.brand.findUnique.mockResolvedValue({
        id: 'brand-1',
        name: 'Nike',
        isDeleted: true,
      });

      await expect(service.findOne('brand-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const dto = { name: 'Nike Updated' };

    it('should update a brand successfully', async () => {
      mockPrisma.brand.findUnique
        .mockResolvedValueOnce({
          id: 'brand-1',
          name: 'Nike',
          isDeleted: false,
        }) // findOne check
        .mockResolvedValueOnce(null); // name conflict check
      mockPrisma.brand.update.mockResolvedValue({ id: 'brand-1', ...dto });

      const result = await service.update('brand-1', dto);

      expect(mockPrisma.brand.update).toHaveBeenCalledWith({
        where: { id: 'brand-1' },
        data: dto,
      });
      expect(result.name).toBe('Nike Updated');
    });

    it('should throw ConflictException if trying to update to a name owned by another brand', async () => {
      mockPrisma.brand.findUnique
        .mockResolvedValueOnce({
          id: 'brand-1',
          name: 'Nike',
          isDeleted: false,
        }) // findOne check
        .mockResolvedValueOnce({ id: 'other-brand', name: 'Nike Updated' }); // name conflict check

      await expect(service.update('brand-1', dto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockPrisma.brand.update).not.toHaveBeenCalled();
    });

    it('should allow updating name to the same name owned by the same brand', async () => {
      mockPrisma.brand.findUnique
        .mockResolvedValueOnce({
          id: 'brand-1',
          name: 'Nike',
          isDeleted: false,
        }) // findOne check
        .mockResolvedValueOnce({ id: 'brand-1', name: 'Nike' }); // name conflict check (owned by self)
      mockPrisma.brand.update.mockResolvedValue({
        id: 'brand-1',
        name: 'Nike',
      });

      const result = await service.update('brand-1', { name: 'Nike' });

      expect(result.name).toBe('Nike');
      expect(mockPrisma.brand.update).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should soft-delete a brand when found', async () => {
      mockPrisma.brand.findUnique.mockResolvedValue({
        id: 'brand-1',
        name: 'Nike',
        isDeleted: false,
      });
      mockPrisma.brand.update.mockResolvedValue({
        id: 'brand-1',
        isDeleted: true,
      });

      const result = await service.remove('brand-1');

      expect(mockPrisma.brand.update).toHaveBeenCalledWith({
        where: { id: 'brand-1' },
        data: { isDeleted: true },
      });
      expect(result).toEqual({
        message: 'Brand deleted successfully',
        id: 'brand-1',
      });
    });
  });
});
