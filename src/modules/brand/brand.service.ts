import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

@Injectable()
export class BrandService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBrandDto) {
    const existing = await this.prisma.brand.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException(
        `Brand with name "${dto.name}" already exists`,
      );
    }
    return this.prisma.brand.create({ data: dto });
  }

  async findAll(query?: PaginationQueryDto) {
    const { page = 1, limit = 10, search } = query || {};
    const skip = (page - 1) * limit;

    const where: any = { isDeleted: false };

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.brand.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.brand.count({ where }),
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
    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand || brand.isDeleted) {
      throw new NotFoundException(`Brand with ID ${id} not found`);
    }
    return brand;
  }

  async update(id: string, dto: UpdateBrandDto) {
    await this.findOne(id);
    if (dto.name) {
      const existing = await this.prisma.brand.findUnique({
        where: { name: dto.name },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Brand with name "${dto.name}" already exists`,
        );
      }
    }
    return this.prisma.brand.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.brand.update({
      where: { id },
      data: { isDeleted: true },
    });
    return { message: 'Brand deleted successfully', id };
  }
}
