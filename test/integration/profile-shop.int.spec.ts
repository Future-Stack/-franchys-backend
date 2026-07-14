import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ProfileShopService } from 'src/modules/profile-shop/profile-shop.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { createTestPrisma, cleanupTest, seedShopInformation } from '../setup/test-helpers';

describe('ProfileShopService (integration)', () => {
  let module: TestingModule;
  let service: ProfileShopService;
  let prisma: PrismaClient;
  const shopInformationIds: string[] = [];
  const originalEnv = process.env.SHOP_NAME;

  beforeAll(async () => {
    prisma = createTestPrisma();

    module = await Test.createTestingModule({
      providers: [
        ProfileShopService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<ProfileShopService>(ProfileShopService);
  });

  afterAll(async () => {
    process.env.SHOP_NAME = originalEnv;
    await prisma.$disconnect();
    await module.close();
  });

  afterEach(async () => {
    await cleanupTest(prisma, { shopInformationIds });
    shopInformationIds.length = 0;
  });

  describe('getActiveShop', () => {
    it('should retrieve the active shop details mapped from env', async () => {
      const identifier = `Francys-int-${Date.now()}`;
      process.env.SHOP_NAME = identifier;

      const shop = await seedShopInformation(prisma, { shopIdentifier: identifier });
      shopInformationIds.push(shop.shopId);

      const active = await service.getActiveShop();
      expect(active.shopId).toBe(shop.shopId);
      expect(active.shopIdentifier).toBe(identifier);
    });

    it('should throw NotFoundException on non-existent shop config', async () => {
      process.env.SHOP_NAME = 'Does-Not-Exist';
      await expect(service.getActiveShop()).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateActiveShop', () => {
    it('should update active shop details', async () => {
      const identifier = `Francys-upd-${Date.now()}`;
      process.env.SHOP_NAME = identifier;

      const shop = await seedShopInformation(prisma, { shopIdentifier: identifier });
      shopInformationIds.push(shop.shopId);

      const updated = await service.updateActiveShop({
        companyName: 'Francys Brand New name',
        phone: '1234567',
      });

      expect(updated.companyName).toBe('Francys Brand New name');
      expect(updated.phone).toBe('1234567');
    });
  });
});
