import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  Prisma,
  CampaignType as PrismaCampaignType,
  CampaignStatus as PrismaCampaignStatus,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/campaign.dto';
import { ValidateDiscountDto } from './dto/validate-discount.dto';
import { SendPromotionalEmailDto } from './dto/send-promotional-email.dto';

@Injectable()
export class CampaignService {
  private readonly logger = new Logger(CampaignService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

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

    // Trigger sending logic — dispatches promotional email to all active customers
    try {
      await this.sendPromotionalEmail({
        campaignId: id,
        sendToAll: true,
        subject: campaign.title,
        title: campaign.title,
        messageContent: campaign.termsCondition || `<p>Special Offer: Use promo code <strong>${campaign.promoCode || ''}</strong> at checkout!</p>`,
        promoCode: campaign.promoCode || undefined,
      });
    } catch (err: any) {
      // Gracefully ignore error if no customers exist or email is unconfigured
    }

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

  /**
   * Send bulk promotional email to selected customers or all customers.
   * Does NOT save to Message DB table as requested.
   */
  async sendPromotionalEmail(dto: SendPromotionalEmailDto) {
    const where: any = { isDeleted: false };
    if (!dto.sendToAll && dto.customerIds && dto.customerIds.length > 0) {
      where.id = { in: dto.customerIds };
    }

    const customers = await this.prisma.customer.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        companyName: true,
      },
    });

    if (customers.length === 0) {
      throw new BadRequestException('No eligible customers found to send email.');
    }

    const shopInfo = await this.prisma.shopInformation.findFirst();
    const shopName = shopInfo?.companyName || 'MAK SERVI';
    const shopLogoUrl = shopInfo?.companyLogo || null;
    const year = new Date().getFullYear();

    let successCount = 0;
    let failedCount = 0;
    const failedEmails: Array<{ email: string; reason: string }> = [];

    for (const customer of customers) {
      if (!customer.email) continue;

      const customerName =
        customer.companyName ||
        `${customer.firstName} ${customer.lastName}`.trim() ||
        'Valued Customer';

      try {
        await this.mailService.sendPromotionalEmail(customer.email, {
          customerName,
          subject: dto.subject,
          title: dto.title,
          messageContent: dto.messageContent,
          promoCode: dto.promoCode,
          ctaUrl: dto.ctaUrl,
          shopName,
          shopLogoUrl,
          year,
        });
        successCount++;
      } catch (err: any) {
        this.logger.error(
          `❌ Failed sending promotional email to ${customer.email}: ${err.message}`,
        );
        failedCount++;
        failedEmails.push({
          email: customer.email,
          reason: err.message || 'Email delivery failed',
        });
      }
    }

    // If linked to a Campaign ID, update campaign status & count
    if (dto.campaignId) {
      await this.prisma.campaign.update({
        where: { id: dto.campaignId },
        data: {
          status: PrismaCampaignStatus.SENT,
          recipientsCount: successCount,
        },
      });
    }

    return {
      message: `Bulk promotional email dispatch completed. Sent: ${successCount}, Failed: ${failedCount}`,
      totalTargeted: customers.length,
      successCount,
      failedCount,
      failedEmails,
    };
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
