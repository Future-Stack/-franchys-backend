import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CampaignService } from 'src/modules/campaign/campaign.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { createTestPrisma, seedCampaign, cleanupTest } from '../setup/test-helpers';

// ─── Integration Test: CampaignService ───────────────────────────────────────

describe('CampaignService (integration)', () => {
  let module: TestingModule;
  let service: CampaignService;
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = createTestPrisma();

    module = await Test.createTestingModule({
      providers: [
        CampaignService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CampaignService>(CampaignService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await module.close();
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    const campaignIds: string[] = [];

    afterAll(async () => {
      await cleanupTest(prisma, { campaignIds });
    });

    it('should persist a campaign with DRAFT status', async () => {
      const campaign = await service.create({
        title: 'Summer Sale',
        type: 'DISCOUNT',
        promoCode: 'SUMMER20',
        discountType: 'percentage',
        percentage: 20,
      });

      campaignIds.push(campaign.id);

      expect(campaign.id).toBeDefined();
      expect(campaign.status).toBe('DRAFT');
      expect(campaign.promoCode).toBe('SUMMER20');
      expect(campaign.recipientsCount).toBe(0);
    });

    it('should persist featuredProducts as a string array', async () => {
      const campaign = await service.create({
        title: 'Product Feature',
        type: 'PROMOTION',
        featuredProducts: ['prod-1', 'prod-2'],
      });

      campaignIds.push(campaign.id);
      expect(campaign.featuredProducts).toEqual(['prod-1', 'prod-2']);
    });
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    const campaignIds: string[] = [];

    beforeAll(async () => {
      const c1 = await seedCampaign(prisma, { type: 'DISCOUNT', status: 'DRAFT' });
      const c2 = await seedCampaign(prisma, { type: 'NEWSLETTER', status: 'SENT' });
      const c3 = await seedCampaign(prisma, {
        title: 'SearchableCampaign-XYZ',
        type: 'PROMOTION',
      });
      campaignIds.push(c1.id, c2.id, c3.id);
    });

    afterAll(async () => {
      await cleanupTest(prisma, { campaignIds });
    });

    it('should return all campaigns', async () => {
      const result = await service.findAll();
      expect(result.length).toBeGreaterThanOrEqual(3);
    });

    it('should filter by type DISCOUNT', async () => {
      const result = await service.findAll('DISCOUNT');
      expect(result.every((c) => c.type === 'DISCOUNT')).toBe(true);
    });

    it('should filter by status SENT', async () => {
      const result = await service.findAll(undefined, 'SENT');
      expect(result.every((c) => c.status === 'SENT')).toBe(true);
    });

    it('should search by title keyword', async () => {
      const result = await service.findAll(undefined, undefined, 'SearchableCampaign');
      expect(result.some((c) => c.title.includes('SearchableCampaign-XYZ'))).toBe(true);
    });
  });

  // ─── send ─────────────────────────────────────────────────────────────────

  describe('send', () => {
    let campaignId: string;

    beforeAll(async () => {
      const campaign = await seedCampaign(prisma, { recipientsCount: 300 });
      campaignId = campaign.id;
    });

    afterAll(async () => {
      await cleanupTest(prisma, { campaignIds: [campaignId] });
    });

    it('should set status to SENT and persist', async () => {
      const result = await service.send(campaignId);
      expect(result.status).toBe('SENT');

      // Verify persisted in DB
      const fresh = await service.findOne(campaignId);
      expect(fresh.status).toBe('SENT');
    });

    it('should preserve existing recipientsCount', async () => {
      const result = await service.send(campaignId);
      expect(result.recipientsCount).toBe(300);
    });
  });

  // ─── validateDiscountCode ─────────────────────────────────────────────────

  describe('validateDiscountCode', () => {
    const campaignIds: string[] = [];

    afterAll(async () => {
      await cleanupTest(prisma, { campaignIds });
    });

    async function createSentCampaign(overrides: Record<string, unknown> = {}) {
      const campaign = await seedCampaign(prisma, {
        status: 'SENT',
        promoCode: `PROMO-${Date.now()}`,
        discountType: 'percentage',
        percentage: 10,
        ...overrides,
      });
      campaignIds.push(campaign.id);
      return campaign;
    }

    it('should throw NotFoundException for unknown promo code', async () => {
      await expect(
        service.validateDiscountCode({ code: 'DOESNOTEXIST', orderAmount: 100 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if campaign is DRAFT', async () => {
      const campaign = await seedCampaign(prisma, {
        status: 'DRAFT',
        promoCode: `DRAFT-${Date.now()}`,
      });
      campaignIds.push(campaign.id);

      await expect(
        service.validateDiscountCode({ code: campaign.promoCode!, orderAmount: 100 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if startDate is in future', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const campaign = await createSentCampaign({ startDate: tomorrow });

      await expect(
        service.validateDiscountCode({ code: campaign.promoCode!, orderAmount: 100 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if endDate has passed', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const campaign = await createSentCampaign({ endDate: yesterday });

      await expect(
        service.validateDiscountCode({ code: campaign.promoCode!, orderAmount: 100 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if order below minOrderAmount', async () => {
      const campaign = await createSentCampaign({ minOrderAmount: 500 });

      await expect(
        service.validateDiscountCode({ code: campaign.promoCode!, orderAmount: 200 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return correct percentage discount result', async () => {
      const campaign = await createSentCampaign({
        discountType: 'percentage',
        percentage: 10,
      });

      const result = await service.validateDiscountCode({
        code: campaign.promoCode!,
        orderAmount: 300,
      });

      expect(result.valid).toBe(true);
      expect(result.discountAmount).toBe(30);  // 10% of 300
      expect(result.finalAmount).toBe(270);    // 300 - 30
    });

    it('should return correct flat discount result', async () => {
      const campaign = await createSentCampaign({
        discountType: 'flat',
        percentage: 50,
      });

      const result = await service.validateDiscountCode({
        code: campaign.promoCode!,
        orderAmount: 300,
      });

      expect(result.valid).toBe(true);
      expect(result.discountAmount).toBe(50);  // flat $50
      expect(result.finalAmount).toBe(250);    // 300 - 50
    });

    it('should validate successfully within active date window', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const campaign = await createSentCampaign({
        startDate: yesterday,
        endDate: tomorrow,
      });

      const result = await service.validateDiscountCode({
        code: campaign.promoCode!,
        orderAmount: 200,
      });

      expect(result.valid).toBe(true);
    });
  });

  // ─── remove ───────────────────────────────────────────────────────────────

  describe('remove', () => {
    let campaignId: string;

    beforeAll(async () => {
      const campaign = await seedCampaign(prisma);
      campaignId = campaign.id;
    });

    it('should delete campaign and return success message', async () => {
      const result = await service.remove(campaignId);
      expect(result).toEqual({ message: 'Campaign deleted successfully', id: campaignId });

      const row = await prisma.campaign.findUnique({ where: { id: campaignId } });
      expect(row).toBeNull();
    });

    it('should throw NotFoundException when campaign does not exist', async () => {
      await expect(
        service.remove('00000000-0000-0000-0000-000000000000'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
