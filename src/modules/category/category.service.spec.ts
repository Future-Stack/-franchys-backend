import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { CategoryService } from './category.service';
import { PrismaService } from 'src/prisma/prisma.service';

const mockPrisma = {
  category: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

describe('CategoryService (unit)', () => {
  let service: CategoryService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
  });

  describe('create', () => {
    const dto = { name: 'Apparel', description: 'Shirts and Hoodies' };

    it('should create a category successfully', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);
      mockPrisma.category.create.mockResolvedValue({
        id: 'cat-1',
        ...dto,
        isDeleted: false,
      });

      const result = await service.create(dto);

      expect(mockPrisma.category.findUnique).toHaveBeenCalledWith({
        where: { name: dto.name },
      });
      expect(mockPrisma.category.create).toHaveBeenCalledWith({ data: dto });
      expect(result.id).toBe('cat-1');
    });

    it('should throw ConflictException if category name already exists', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({
        id: 'existing-id',
        ...dto,
      });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(mockPrisma.category.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all active categories', async () => {
      const mockCategories = [
        { id: '1', name: 'Apparel', isDeleted: false },
        { id: '2', name: 'Bags', isDeleted: false },
      ];
      mockPrisma.category.findMany.mockResolvedValue(mockCategories);

      const result = await service.findAll();

      expect(mockPrisma.category.findMany).toHaveBeenCalledWith({
        where: { isDeleted: false },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockCategories);
    });
  });

  describe('findOne', () => {
    it('should return a category when found and not deleted', async () => {
      const mockCategory = { id: 'cat-1', name: 'Apparel', isDeleted: false };
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory);

      const result = await service.findOne('cat-1');

      expect(mockPrisma.category.findUnique).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
      });
      expect(result).toEqual(mockCategory);
    });

    it('should throw NotFoundException when category not found', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when category is soft-deleted', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({
        id: 'cat-1',
        name: 'Apparel',
        isDeleted: true,
      });

      await expect(service.findOne('cat-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const dto = { name: 'Apparel Updated' };

    it('should update a category successfully', async () => {
      mockPrisma.category.findUnique
        .mockResolvedValueOnce({
          id: 'cat-1',
          name: 'Apparel',
          isDeleted: false,
        }) // findOne check
        .mockResolvedValueOnce(null); // name conflict check
      mockPrisma.category.update.mockResolvedValue({ id: 'cat-1', ...dto });

      const result = await service.update('cat-1', dto);

      expect(mockPrisma.category.update).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
        data: dto,
      });
      expect(result.name).toBe('Apparel Updated');
    });

    it('should throw ConflictException if trying to update to a name owned by another category', async () => {
      mockPrisma.category.findUnique
        .mockResolvedValueOnce({
          id: 'cat-1',
          name: 'Apparel',
          isDeleted: false,
        }) // findOne check
        .mockResolvedValueOnce({ id: 'other-cat', name: 'Apparel Updated' }); // name conflict check

      await expect(service.update('cat-1', dto)).rejects.toThrow(
        ConflictException,
      );
      expect(mockPrisma.category.update).not.toHaveBeenCalled();
    });

    it('should allow updating name to the same name owned by the same category', async () => {
      mockPrisma.category.findUnique
        .mockResolvedValueOnce({
          id: 'cat-1',
          name: 'Apparel',
          isDeleted: false,
        }) // findOne check
        .mockResolvedValueOnce({ id: 'cat-1', name: 'Apparel' }); // name conflict check (owned by self)
      mockPrisma.category.update.mockResolvedValue({
        id: 'cat-1',
        name: 'Apparel',
      });

      const result = await service.update('cat-1', { name: 'Apparel' });

      expect(result.name).toBe('Apparel');
      expect(mockPrisma.category.update).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should soft-delete a category when found', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({
        id: 'cat-1',
        name: 'Apparel',
        isDeleted: false,
      });
      mockPrisma.category.update.mockResolvedValue({
        id: 'cat-1',
        isDeleted: true,
      });

      const result = await service.remove('cat-1');

      expect(mockPrisma.category.update).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
        data: { isDeleted: true },
      });
      expect(result).toEqual({
        message: 'Category deleted successfully',
        id: 'cat-1',
      });
    });
  });
});
