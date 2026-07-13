import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  CampaignType as PrismaCampaignType,
  CampaignStatus as PrismaCampaignStatus,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/campaign.dto';

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

  async findAll(type?: string, status?: string, search?: string) {
    const whereClause: Prisma.CampaignWhereInput = {};

    if (type) {
      whereClause.type = type as PrismaCampaignType;
    }

    if (status) {
      whereClause.status = status as PrismaCampaignStatus;
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { targetAudience: { contains: search, mode: 'insensitive' } },
        { promoCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    return await this.prisma.campaign.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });
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

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.campaign.delete({ where: { id } });
    return { message: 'Campaign deleted successfully', id };
  }
}
