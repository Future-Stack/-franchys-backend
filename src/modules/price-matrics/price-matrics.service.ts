import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreatePriceMatrixDto,
  UpdatePriceMatrixDto,
  CreatePriceTierDto,
  UpdatePriceTierDto,
} from './dto/price-matrix.dto';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

@Injectable()
export class PriceMatricsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createPriceMatrixDto: CreatePriceMatrixDto) {
    const { name, priceType, columns, priceTiers } = createPriceMatrixDto;

    return this.prisma.priceMatrix.create({
      data: {
        name,
        priceType,
        columns: columns || [],
        priceTiers: priceTiers
          ? {
              create: priceTiers.map((tier) => ({
                quantity: tier.quantity,
                basePrice: tier.basePrice ?? 0,
                markup: tier.markup,
                columnPrices: tier.columnPrices ?? undefined,
              })),
            }
          : undefined,
      },
      include: {
        priceTiers: true,
      },
    });
  }

  async findAll(query?: PaginationQueryDto) {
    const { page = 1, limit = 10, search } = query || {};
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.priceMatrix.findMany({
        where,
        skip,
        take: limit,
        include: {
          priceTiers: true,
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.priceMatrix.count({ where }),
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

  async findOne(priceMatrixId: string) {
    const matrix = await this.prisma.priceMatrix.findUnique({
      where: { priceMatrixId },
      include: {
        priceTiers: true,
      },
    });

    if (!matrix) {
      throw new NotFoundException(
        `Price Matrix with ID ${priceMatrixId} not found`,
      );
    }

    return matrix;
  }

  async update(
    priceMatrixId: string,
    updatePriceMatrixDto: UpdatePriceMatrixDto,
  ) {
    // Ensure the matrix exists first
    await this.findOne(priceMatrixId);

    const { name, priceType, columns, priceTiers } = updatePriceMatrixDto;

    if (priceTiers && Array.isArray(priceTiers)) {
      return this.prisma.$transaction(async (tx) => {
        await tx.priceTier.deleteMany({ where: { priceMatrixId } });

        return tx.priceMatrix.update({
          where: { priceMatrixId },
          data: {
            ...(name !== undefined ? { name } : {}),
            ...(priceType !== undefined ? { priceType } : {}),
            ...(columns !== undefined ? { columns } : {}),
            priceTiers: {
              create: priceTiers.map((tier) => ({
                quantity: tier.quantity,
                basePrice: tier.basePrice ?? 0,
                markup: tier.markup,
                columnPrices: tier.columnPrices ?? undefined,
              })),
            },
          },
          include: {
            priceTiers: true,
          },
        });
      });
    }

    return this.prisma.priceMatrix.update({
      where: { priceMatrixId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(priceType !== undefined ? { priceType } : {}),
        ...(columns !== undefined ? { columns } : {}),
      },
      include: {
        priceTiers: true,
      },
    });
  }

  async remove(priceMatrixId: string) {
    await this.findOne(priceMatrixId);

    // Gap H: Guard against orphaning QuoteLineItem records
    const referencedCount = await this.prisma.quoteLineItem.count({
      where: { matrixId: priceMatrixId },
    });

    if (referencedCount > 0) {
      throw new ConflictException(
        `Cannot delete price matrix: it is currently referenced by ${referencedCount} quote line item(s).`,
      );
    }

    await this.prisma.priceMatrix.delete({
      where: { priceMatrixId },
    });

    return {
      message: 'Price Matrix and all its associated tiers deleted successfully',
      priceMatrixId,
    };
  }

  async addTier(priceMatrixId: string, createPriceTierDto: CreatePriceTierDto) {
    await this.findOne(priceMatrixId);

    return this.prisma.priceTier.create({
      data: {
        quantity: createPriceTierDto.quantity,
        basePrice: createPriceTierDto.basePrice ?? 0,
        markup: createPriceTierDto.markup,
        columnPrices: createPriceTierDto.columnPrices ?? undefined,
        priceMatrixId,
      },
    });
  }

  async updateTier(
    priceTierId: string,
    updatePriceTierDto: UpdatePriceTierDto,
  ) {
    const tier = await this.prisma.priceTier.findUnique({
      where: { priceTierId },
    });

    if (!tier) {
      throw new NotFoundException(
        `Price Tier with ID ${priceTierId} not found`,
      );
    }

    return this.prisma.priceTier.update({
      where: { priceTierId },
      data: {
        quantity: updatePriceTierDto.quantity,
        basePrice: updatePriceTierDto.basePrice ?? undefined,
        markup: updatePriceTierDto.markup,
        columnPrices: updatePriceTierDto.columnPrices ?? undefined,
      },
    });
  }

  async removeTier(priceTierId: string) {
    const tier = await this.prisma.priceTier.findUnique({
      where: { priceTierId },
    });

    if (!tier) {
      throw new NotFoundException(
        `Price Tier with ID ${priceTierId} not found`,
      );
    }

    await this.prisma.priceTier.delete({
      where: { priceTierId },
    });

    return {
      message: 'Price Tier deleted successfully',
      priceTierId,
    };
  }
}
