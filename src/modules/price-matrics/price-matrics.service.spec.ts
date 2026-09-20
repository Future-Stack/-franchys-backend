import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { PriceMatricsService } from './price-matrics.service';
import { PrismaService } from 'src/prisma/prisma.service';

const mockPrisma = {
  priceMatrix: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn().mockResolvedValue(1),
  },
  priceTier: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  quoteLineItem: {
    count: jest.fn().mockResolvedValue(0),
  },
  $transaction: jest.fn((cb) => cb(mockPrisma)),
};

describe('PriceMatricsService (unit)', () => {
  let service: PriceMatricsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PriceMatricsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<PriceMatricsService>(PriceMatricsService);
  });

  describe('create', () => {
    const dto = {
      name: 'Custom Markup Matrix',
      priceType: 'markup',
      columns: ['1 Color', '2 Colors'],
      priceTiers: [
        {
          quantity: 10,
          basePrice: 5.0,
          markup: 2.0,
          columnPrices: { '1 Color': 3.5, '2 Colors': 4.5 },
        },
      ],
    };

    it('should create 2D price matrix and associated tiers with columnPrices', async () => {
      mockPrisma.priceMatrix.create.mockResolvedValue({
        priceMatrixId: 'matrix-1',
        ...dto,
      });

      const result = await service.create(dto);

      expect(mockPrisma.priceMatrix.create).toHaveBeenCalledWith({
        data: {
          name: dto.name,
          priceType: dto.priceType,
          columns: ['1 Color', '2 Colors'],
          priceTiers: {
            create: [
              {
                quantity: 10,
                basePrice: 5.0,
                markup: 2.0,
                columnPrices: { '1 Color': 3.5, '2 Colors': 4.5 },
              },
            ],
          },
        },
        include: {
          priceTiers: true,
        },
      });
      expect(result.priceMatrixId).toBe('matrix-1');
    });
  });

  describe('findAll', () => {
    it('should return all matrices with tiers', async () => {
      mockPrisma.priceMatrix.findMany.mockResolvedValue([
        { priceMatrixId: 'matrix-1', priceTiers: [] },
      ]);
      mockPrisma.priceMatrix.count.mockResolvedValue(1);

      const result = await service.findAll();

      expect(result.data).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return a matrix when found by ID', async () => {
      mockPrisma.priceMatrix.findUnique.mockResolvedValue({
        priceMatrixId: 'matrix-1',
        priceTiers: [],
      });

      const result = await service.findOne('matrix-1');

      expect(mockPrisma.priceMatrix.findUnique).toHaveBeenCalledWith({
        where: { priceMatrixId: 'matrix-1' },
        include: { priceTiers: true },
      });
      expect(result.priceMatrixId).toBe('matrix-1');
    });

    it('should throw NotFoundException if matrix not found', async () => {
      mockPrisma.priceMatrix.findUnique.mockResolvedValue(null);

      await expect(service.findOne('matrix-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update matrix details successfully', async () => {
      mockPrisma.priceMatrix.findUnique.mockResolvedValue({
        priceMatrixId: 'matrix-1',
      });
      mockPrisma.priceMatrix.update.mockResolvedValue({
        priceMatrixId: 'matrix-1',
        name: 'Updated Matrix',
      });

      const result = await service.update('matrix-1', {
        name: 'Updated Matrix',
      });

      expect(mockPrisma.priceMatrix.update).toHaveBeenCalledWith({
        where: { priceMatrixId: 'matrix-1' },
        data: { name: 'Updated Matrix' },
        include: { priceTiers: true },
      });
      expect(result.name).toBe('Updated Matrix');
    });

    it('should atomically replace tiers when priceTiers array is provided', async () => {
      mockPrisma.priceMatrix.findUnique.mockResolvedValue({
        priceMatrixId: 'matrix-1',
      });
      mockPrisma.priceMatrix.update.mockResolvedValue({
        priceMatrixId: 'matrix-1',
        name: 'Updated Matrix',
        priceTiers: [{ quantity: 24, basePrice: 3.0, markup: 1.5 }],
      });

      await service.update('matrix-1', {
        name: 'Updated Matrix',
        priceTiers: [{ quantity: 24, basePrice: 3.0, markup: 1.5 }],
      });

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.priceTier.deleteMany).toHaveBeenCalledWith({
        where: { priceMatrixId: 'matrix-1' },
      });
    });
  });

  describe('remove', () => {
    it('should delete matrix when no quotes reference it', async () => {
      mockPrisma.priceMatrix.findUnique.mockResolvedValue({
        priceMatrixId: 'matrix-1',
      });
      mockPrisma.quoteLineItem.count.mockResolvedValue(0);
      mockPrisma.priceMatrix.delete.mockResolvedValue({});

      const result = await service.remove('matrix-1');

      expect(mockPrisma.quoteLineItem.count).toHaveBeenCalledWith({
        where: { matrixId: 'matrix-1' },
      });
      expect(mockPrisma.priceMatrix.delete).toHaveBeenCalledWith({
        where: { priceMatrixId: 'matrix-1' },
      });
      expect(result.message).toBe(
        'Price Matrix and all its associated tiers deleted successfully',
      );
    });

    it('should throw ConflictException if quote line items reference the matrix (Gap H)', async () => {
      mockPrisma.priceMatrix.findUnique.mockResolvedValue({
        priceMatrixId: 'matrix-1',
      });
      mockPrisma.quoteLineItem.count.mockResolvedValue(3);

      await expect(service.remove('matrix-1')).rejects.toThrow(
        ConflictException,
      );
      expect(mockPrisma.priceMatrix.delete).not.toHaveBeenCalled();
    });
  });

  describe('addTier', () => {
    it('should add a tier to an existing price matrix with columnPrices', async () => {
      mockPrisma.priceMatrix.findUnique.mockResolvedValue({
        priceMatrixId: 'matrix-1',
      });
      mockPrisma.priceTier.create.mockResolvedValue({
        priceTierId: 'tier-1',
        quantity: 20,
      });

      const result = await service.addTier('matrix-1', {
        quantity: 20,
        basePrice: 4.0,
        markup: 1.0,
        columnPrices: { '1 Color': 2.5 },
      });

      expect(mockPrisma.priceTier.create).toHaveBeenCalledWith({
        data: {
          quantity: 20,
          basePrice: 4.0,
          markup: 1.0,
          columnPrices: { '1 Color': 2.5 },
          priceMatrixId: 'matrix-1',
        },
      });
      expect(result.priceTierId).toBe('tier-1');
    });
  });

  describe('updateTier', () => {
    it('should update a specific price tier successfully with columnPrices', async () => {
      mockPrisma.priceTier.findUnique.mockResolvedValue({
        priceTierId: 'tier-1',
      });
      mockPrisma.priceTier.update.mockResolvedValue({
        priceTierId: 'tier-1',
        quantity: 25,
      });

      const result = await service.updateTier('tier-1', {
        quantity: 25,
        basePrice: 4.5,
        markup: 1.2,
        columnPrices: { '2 Colors': 3.75 },
      });

      expect(mockPrisma.priceTier.update).toHaveBeenCalledWith({
        where: { priceTierId: 'tier-1' },
        data: {
          quantity: 25,
          basePrice: 4.5,
          markup: 1.2,
          columnPrices: { '2 Colors': 3.75 },
        },
      });
      expect(result.quantity).toBe(25);
    });

    it('should throw NotFoundException on updating non-existent tier', async () => {
      mockPrisma.priceTier.findUnique.mockResolvedValue(null);

      await expect(
        service.updateTier('tier-1', {
          quantity: 25,
          basePrice: 4.5,
          markup: 1.2,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeTier', () => {
    it('should delete a specific price tier successfully', async () => {
      mockPrisma.priceTier.findUnique.mockResolvedValue({
        priceTierId: 'tier-1',
      });
      mockPrisma.priceTier.delete.mockResolvedValue({});

      const result = await service.removeTier('tier-1');

      expect(mockPrisma.priceTier.delete).toHaveBeenCalledWith({
        where: { priceTierId: 'tier-1' },
      });
      expect(result.message).toBe('Price Tier deleted successfully');
    });
  });
});
