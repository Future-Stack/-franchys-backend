import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProfileShopService } from './profile-shop.service';
import { PrismaService } from 'src/prisma/prisma.service';

const mockPrisma = {
  shopInformation: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

describe('ProfileShopService (unit)', () => {
  let service: ProfileShopService;
  const originalEnv = process.env;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileShopService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<ProfileShopService>(ProfileShopService);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('onModuleInit', () => {
    it('should initialize and seed shop information if it does not exist', async () => {
      process.env.SHOP_NAME = 'Francys';
      mockPrisma.shopInformation.findUnique.mockResolvedValue(null);
      mockPrisma.shopInformation.create.mockResolvedValue({ shopId: 'shop-1', shopIdentifier: 'Francys' });

      await service.onModuleInit();

      expect(mockPrisma.shopInformation.findUnique).toHaveBeenCalledWith({ where: { shopIdentifier: 'Francys' } });
      expect(mockPrisma.shopInformation.create).toHaveBeenCalledWith({
        data: {
          shopIdentifier: 'Francys',
          companyName: 'Francys',
        },
      });
    });

    it('should skip initialization if SHOP_NAME is not set', async () => {
      delete process.env.SHOP_NAME;

      await service.onModuleInit();

      expect(mockPrisma.shopInformation.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('getActiveShop', () => {
    it('should return shop details when found in the database', async () => {
      process.env.SHOP_NAME = 'Francys';
      mockPrisma.shopInformation.findUnique.mockResolvedValue({ shopId: 'shop-1', shopIdentifier: 'Francys' });

      const result = await service.getActiveShop();

      expect(result.shopId).toBe('shop-1');
    });

    it('should throw NotFoundException if SHOP_NAME is missing', async () => {
      delete process.env.SHOP_NAME;

      await expect(service.getActiveShop()).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if shop information not found', async () => {
      process.env.SHOP_NAME = 'MissingShop';
      mockPrisma.shopInformation.findUnique.mockResolvedValue(null);

      await expect(service.getActiveShop()).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateActiveShop', () => {
    it('should update shop information successfully', async () => {
      process.env.SHOP_NAME = 'Francys';
      mockPrisma.shopInformation.findUnique.mockResolvedValue({ shopId: 'shop-1', shopIdentifier: 'Francys' });
      mockPrisma.shopInformation.update.mockResolvedValue({ shopId: 'shop-1', companyName: 'Francys Updated' });

      const result = await service.updateActiveShop({ companyName: 'Francys Updated' });

      expect(mockPrisma.shopInformation.update).toHaveBeenCalledWith({
        where: { shopId: 'shop-1' },
        data: { companyName: 'Francys Updated' },
      });
      expect(result.companyName).toBe('Francys Updated');
    });
  });
});
