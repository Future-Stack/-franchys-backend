import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CampaignService } from './campaign.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { CampaignStatus as PrismaCampaignStatus } from '@prisma/client';

// ─── Prisma Mock ─────────────────────────────────────────────────────────────

const mockPrisma = {
  campaign: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn().mockResolvedValue(1),
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const buildCampaign = (overrides: Record<string, unknown> = {}) => ({
  id: 'camp-1',
  title: '10% Summer Sale',
  type: 'EMAIL',
  status: PrismaCampaignStatus.DRAFT,
  promoCode: 'SUMMER10',
  discountType: 'percentage',
  percentage: 10,
  minOrderAmount: null,
  usageLimit: null,
  startDate: null,
  endDate: null,
  recipientsCount: 0,
  targetAudience: null,
  termsCondition: null,
  featuredProducts: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('CampaignService', () => {
  let service: CampaignService;

  beforeEach(async () => {
    const mockMailService = {
      sendPromotionalEmail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<CampaignService>(CampaignService);
    jest.clearAllMocks();
  });

  // ─── create ───────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should create a campaign with DRAFT default status', async () => {
      const campaign = buildCampaign();
      mockPrisma.campaign.create.mockResolvedValue(campaign);

      const result = await service.create({
        title: '10% Summer Sale',
        type: 'EMAIL' as never,
        promoCode: 'SUMMER10',
      });

      expect(mockPrisma.campaign.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ title: '10% Summer Sale' }),
        }),
      );
      expect(result).toEqual(campaign);
    });

    it('should set recipientsCount to 0 when not provided', async () => {
      mockPrisma.campaign.create.mockResolvedValue(buildCampaign());

      await service.create({ title: 'Test', type: 'EMAIL' as never });

      expect(mockPrisma.campaign.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ recipientsCount: 0 }),
        }),
      );
    });
  });

  // ─── findOne ──────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return campaign when found', async () => {
      const campaign = buildCampaign();
      mockPrisma.campaign.findUnique.mockResolvedValue(campaign);

      const result = await service.findOne('camp-1');
      expect(result).toEqual(campaign);
    });

    it('should throw NotFoundException when campaign not found', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── findAll ──────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return all campaigns', async () => {
      mockPrisma.campaign.findMany.mockResolvedValue([buildCampaign()]);

      const result = await service.findAll();
      expect(result.data).toHaveLength(1);
    });

    it('should apply type and status filters', async () => {
      mockPrisma.campaign.findMany.mockResolvedValue([]);

      await service.findAll('EMAIL', 'SENT', 'summer');

      expect(mockPrisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: 'EMAIL',
            status: 'SENT',
            OR: expect.any(Array),
          }),
        }),
      );
    });
  });

  // ─── send ─────────────────────────────────────────────────────────────────

  describe('send', () => {
    it('should set status to SENT', async () => {
      const campaign = buildCampaign({ recipientsCount: 250 });
      mockPrisma.campaign.findUnique.mockResolvedValue(campaign);
      const sentCampaign = buildCampaign({
        status: PrismaCampaignStatus.SENT,
        recipientsCount: 250,
      });
      mockPrisma.campaign.update.mockResolvedValue(sentCampaign);

      const result = await service.send('camp-1');

      expect(mockPrisma.campaign.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: PrismaCampaignStatus.SENT }),
        }),
      );
      expect(result.status).toBe(PrismaCampaignStatus.SENT);
    });

    it('should keep existing recipientsCount when greater than 0', async () => {
      const campaign = buildCampaign({ recipientsCount: 350 });
      mockPrisma.campaign.findUnique.mockResolvedValue(campaign);
      mockPrisma.campaign.update.mockResolvedValue(
        buildCampaign({
          status: PrismaCampaignStatus.SENT,
          recipientsCount: 350,
        }),
      );

      await service.send('camp-1');

      expect(mockPrisma.campaign.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ recipientsCount: 350 }),
        }),
      );
    });
  });

  // ─── validateDiscountCode ─────────────────────────────────────────────────

  describe('validateDiscountCode', () => {
    const sentCampaign = (overrides: Record<string, unknown> = {}) =>
      buildCampaign({
        status: PrismaCampaignStatus.SENT,
        promoCode: 'SUMMER10',
        discountType: 'percentage',
        percentage: 10,
        minOrderAmount: null,
        startDate: null,
        endDate: null,
        ...overrides,
      });

    it('should throw NotFoundException for unknown promo code', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue(null);

      await expect(
        service.validateDiscountCode({ code: 'BADCODE', orderAmount: 100 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if campaign is not SENT (e.g. DRAFT)', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue(
        buildCampaign({ status: PrismaCampaignStatus.DRAFT }),
      );

      await expect(
        service.validateDiscountCode({ code: 'SUMMER10', orderAmount: 100 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if campaign start date is in the future', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      mockPrisma.campaign.findFirst.mockResolvedValue(
        sentCampaign({ startDate: tomorrow }),
      );

      await expect(
        service.validateDiscountCode({ code: 'SUMMER10', orderAmount: 100 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if campaign end date has passed', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      mockPrisma.campaign.findFirst.mockResolvedValue(
        sentCampaign({ endDate: yesterday }),
      );

      await expect(
        service.validateDiscountCode({ code: 'SUMMER10', orderAmount: 100 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if order amount is below minOrderAmount', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue(
        sentCampaign({ minOrderAmount: 200 }),
      );

      await expect(
        service.validateDiscountCode({ code: 'SUMMER10', orderAmount: 150 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should correctly calculate percentage discount', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue(
        sentCampaign({ percentage: 10 }),
      );

      const result = await service.validateDiscountCode({
        code: 'SUMMER10',
        orderAmount: 200,
      });

      expect(result.valid).toBe(true);
      expect(result.discountAmount).toBe(20); // 10% of 200
      expect(result.finalAmount).toBe(180); // 200 - 20
    });

    it('should correctly calculate flat discount', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue(
        sentCampaign({ discountType: 'flat', percentage: 25 }),
      );

      const result = await service.validateDiscountCode({
        code: 'SUMMER10',
        orderAmount: 200,
      });

      expect(result.valid).toBe(true);
      expect(result.discountAmount).toBe(25); // flat $25
      expect(result.finalAmount).toBe(175); // 200 - 25
    });

    it('should cap discount at the order amount (no negative final)', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue(
        sentCampaign({ percentage: 200 }),
      );

      const result = await service.validateDiscountCode({
        code: 'SUMMER10',
        orderAmount: 100,
      });

      // 200% of 100 = 200, capped to 100
      expect(result.discountAmount).toBe(100);
      expect(result.finalAmount).toBe(0);
    });

    it('should return valid=true with correct structure on success', async () => {
      mockPrisma.campaign.findFirst.mockResolvedValue(sentCampaign());

      const result = await service.validateDiscountCode({
        code: 'SUMMER10',
        orderAmount: 300,
      });

      expect(result).toMatchObject({
        valid: true,
        code: 'SUMMER10',
        discountType: 'percentage',
        discountValue: 10,
      });
    });

    it('should validate successfully when code has correct active dates', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      mockPrisma.campaign.findFirst.mockResolvedValue(
        sentCampaign({ startDate: yesterday, endDate: tomorrow }),
      );

      const result = await service.validateDiscountCode({
        code: 'SUMMER10',
        orderAmount: 100,
      });

      expect(result.valid).toBe(true);
    });
  });

  // ─── remove ───────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should delete campaign and return success message', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue(buildCampaign());
      mockPrisma.campaign.delete.mockResolvedValue({});

      const result = await service.remove('camp-1');

      expect(mockPrisma.campaign.delete).toHaveBeenCalledWith({
        where: { id: 'camp-1' },
      });
      expect(result).toEqual({
        message: 'Campaign deleted successfully',
        id: 'camp-1',
      });
    });

    it('should throw NotFoundException if campaign does not exist', async () => {
      mockPrisma.campaign.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.campaign.delete).not.toHaveBeenCalled();
    });
  });
});
