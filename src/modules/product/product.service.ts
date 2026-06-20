import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateProductDto,
  UpdateProductDto,
  CreateProductColorDto,
  UpdateProductColorDto,
} from './dto/product.dto';

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Product CRUD ────────────────────────────────────────────────────────────

  async create(dto: CreateProductDto) {
    const { colors, ...productData } = dto;

    return this.prisma.product.create({
      data: {
        ...productData,
        colors: colors?.length
          ? { create: colors }
          : undefined,
      },
      include: { colors: true, category: true, brand: true },
    });
  }

  async findAll() {
    return this.prisma.product.findMany({
      where: { isDeleted: false },
      include: { colors: true, category: true, brand: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { colors: true, category: true, brand: true },
    });
    if (!product || product.isDeleted) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data: dto,
      include: { colors: true, category: true, brand: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.product.update({
      where: { id },
      data: { isDeleted: true },
    });
    return { message: 'Product deleted successfully', id };
  }

  // ─── ProductColor Sub-resource ───────────────────────────────────────────────

  async addColor(productId: string, dto: CreateProductColorDto) {
    await this.findOne(productId);
    const existing = await this.prisma.productColor.findUnique({
      where: { productId_name: { productId, name: dto.name } },
    });
    if (existing) {
      throw new ConflictException(
        `Color "${dto.name}" already exists for this product`,
      );
    }
    return this.prisma.productColor.create({
      data: { ...dto, productId },
    });
  }

  async findAllColors(productId: string) {
    await this.findOne(productId);
    return this.prisma.productColor.findMany({ where: { productId } });
  }

  async updateColor(
    productId: string,
    colorId: string,
    dto: UpdateProductColorDto,
  ) {
    await this.findOne(productId);
    const color = await this.prisma.productColor.findUnique({
      where: { id: colorId },
    });
    if (!color || color.productId !== productId) {
      throw new NotFoundException(
        `Color with ID ${colorId} not found on product ${productId}`,
      );
    }
    return this.prisma.productColor.update({
      where: { id: colorId },
      data: dto,
    });
  }

  async removeColor(productId: string, colorId: string) {
    await this.findOne(productId);
    const color = await this.prisma.productColor.findUnique({
      where: { id: colorId },
    });
    if (!color || color.productId !== productId) {
      throw new NotFoundException(
        `Color with ID ${colorId} not found on product ${productId}`,
      );
    }
    await this.prisma.productColor.delete({ where: { id: colorId } });
    return { message: 'Color removed successfully', id: colorId };
  }
}
