import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  Prisma,
  CampaignType as PrismaCampaignType,
  CampaignStatus as PrismaCampaignStatus,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/campaign.dto';
import { ValidateDiscountDto } from './dto/validate-discount.dto';

@Injectable()
export class CampaignService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCampaignDto) {
    return await this.prisma.campaign.create({
      data: {
        title: dto.title,
        type: dto.type,
        status:
          (dto.status as PrismaCampaignStatus) || PrismaCampaignStatus.DRAFT,
        recipientsCount: dto.recipientsCount || 0,
        targetAudience: dto.targetAudience,
        promoCode: dto.promoCode,
        discountType: dto.discountType,
        percentage: dto.percentage,
        minOrderAmount: dto.minOrderAmount,
        usageLimit: dto.usageLimit,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        termsCondition: dto.termsCondition,
        featuredProducts: dto.featuredProducts || [],
      },
    });
  }

  async findAll(queryOrType?: any, legacyStatus?: any, legacySearch?: string) {
    let page = 1;
    let limit = 10;
    let search: string | undefined;
    let type: any;
    let status: any;

    if (typeof queryOrType === 'object' && queryOrType !== null) {
      page = queryOrType.page || 1;
      limit = queryOrType.limit || 10;
      search = queryOrType.search;
      type = queryOrType.type;
      status = queryOrType.status;
    } else {
      type = queryOrType;
      status = legacyStatus;
      search = legacySearch;
    }

    const skip = (page - 1) * limit;

    const whereClause: Prisma.CampaignWhereInput = {};

    if (type) {
      whereClause.type = type;
    }

    if (status) {
      whereClause.status = status;
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { targetAudience: { contains: search, mode: 'insensitive' } },
        { promoCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.campaign.count({ where: whereClause }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
    });
    if (!campaign) {
      throw new NotFoundException(`Campaign with ID ${id} not found`);
    }
    return campaign;
  }

  async update(id: string, dto: UpdateCampaignDto) {
    await this.findOne(id);

    return await this.prisma.campaign.update({
      where: { id },
      data: {
        title: dto.title,
        type: dto.type as PrismaCampaignType,
        status: dto.status as PrismaCampaignStatus,
        recipientsCount: dto.recipientsCount,
        targetAudience: dto.targetAudience,
        promoCode: dto.promoCode,
        discountType: dto.discountType,
        percentage: dto.percentage,
        minOrderAmount: dto.minOrderAmount,
        usageLimit: dto.usageLimit,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        termsCondition: dto.termsCondition,
        featuredProducts: dto.featuredProducts,
      },
    });
  }

  async send(id: string) {
    const campaign = await this.findOne(id);

    // Trigger sending logic (mock dispatch, update status)
    return await this.prisma.campaign.update({
      where: { id },
      data: {
        status: PrismaCampaignStatus.SENT,
        recipientsCount:
          campaign.recipientsCount > 0
            ? campaign.recipientsCount
            : Math.floor(Math.random() * 1000) + 100,
      },
    });
  }

  async validateDiscountCode(dto: ValidateDiscountDto) {
    let campaign = await this.prisma.campaign.findFirst({
      where: {
        promoCode: { equals: dto.code, mode: 'insensitive' },
        status: PrismaCampaignStatus.SENT,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!campaign) {
      campaign = await this.prisma.campaign.findFirst({
        where: { promoCode: { equals: dto.code, mode: 'insensitive' } },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!campaign) {
      throw new NotFoundException(`Promo code "${dto.code}" is invalid`);
    }

    if (campaign.status !== PrismaCampaignStatus.SENT) {
      throw new BadRequestException(`Promo code "${dto.code}" is not active`);
    }

    const now = new Date();
    if (campaign.startDate && new Date(campaign.startDate) > now) {
      throw new BadRequestException(
        `Promo code "${dto.code}" is not yet active`,
      );
    }

    if (campaign.endDate && new Date(campaign.endDate) < now) {
      throw new BadRequestException(`Promo code "${dto.code}" has expired`);
    }

    if (
      campaign.minOrderAmount &&
      dto.orderAmount < Number(campaign.minOrderAmount)
    ) {
      throw new BadRequestException(
        `Minimum order amount of $${campaign.minOrderAmount.toString()} required for this code`,
      );
    }

    // Determine discount value
    let discountAmount = 0;
    if (campaign.discountType === 'percentage' && campaign.percentage) {
      discountAmount = dto.orderAmount * (Number(campaign.percentage) / 100);
    } else if (campaign.discountType === 'flat') {
      discountAmount = Number(campaign.percentage) || 10;
    } else {
      discountAmount = Number(campaign.percentage) || 0;
    }

    // Ensure discount doesn't exceed order amount
    if (discountAmount > dto.orderAmount) {
      discountAmount = dto.orderAmount;
    }

    return {
      valid: true,
      code: dto.code,
      discountType: campaign.discountType,
      discountValue: Number(campaign.percentage),
      discountAmount,
      finalAmount: dto.orderAmount - discountAmount,
    };
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.campaign.delete({ where: { id } });
    return { message: 'Campaign deleted successfully', id };
  }
}
