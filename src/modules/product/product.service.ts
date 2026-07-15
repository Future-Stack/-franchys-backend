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
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // ─── Product CRUD ────────────────────────────────────────────────────────────

  async create(dto: CreateProductDto, files?: Express.Multer.File[]) {
    const { colors, ...productData } = dto;
    delete (productData as any).images;
    let imagePaths: string[] = [];
    if (files && files.length > 0) {
      imagePaths = await this.cloudinaryService.uploadMultipleFiles(files);
    }

    const finalImages = imagePaths;

    return this.prisma.product.create({
      data: {
        ...productData,
        images: finalImages,
        colors: colors?.length ? { create: colors } : undefined,
      },
      include: { colors: true, category: true, brand: true },
    });
  }

  async findAll(query: PaginationQueryDto) {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const where: any = { isDeleted: false };

    if (search) {
      where.OR = [
        { productName: { contains: search, mode: 'insensitive' } },
        { itemNo: { contains: search, mode: 'insensitive' } },
        { material: { contains: search, mode: 'insensitive' } },
        { style: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: { colors: true, category: true, brand: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
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
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { colors: true, category: true, brand: true },
    });
    if (!product || product.isDeleted) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }

  async update(
    id: string,
    dto: UpdateProductDto,
    files?: Express.Multer.File[],
  ) {
    const existingProduct = await this.findOne(id);
    const { existingImages, ...updateData } = dto;
    delete (updateData as any).images;
    const updateInput: any = { ...updateData };

    let finalImages: string[] = [];
    if (existingImages !== undefined) {
      finalImages = [...existingImages];
    } else {
      // If existingImages isn't sent, fallback to current images to prevent accidental deletion
      finalImages = [...existingProduct.images];
    }

    if (files && files.length > 0) {
      const newImagePaths =
        await this.cloudinaryService.uploadMultipleFiles(files);
      finalImages = [...finalImages, ...newImagePaths];
    }

    if (existingImages !== undefined || (files && files.length > 0)) {
      updateInput.images = finalImages;
    }

    return this.prisma.product.update({
      where: { id },
      data: updateInput,
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

  async addColor(
    productId: string,
    dto: CreateProductColorDto | CreateProductColorDto[],
  ) {
    await this.findOne(productId);

    const items = Array.isArray(dto) ? dto : [dto];

    // Check all for duplicates first
    for (const item of items) {
      const existing = await this.prisma.productColor.findUnique({
        where: { productId_name: { productId, name: item.name } },
      });
      if (existing) {
        throw new ConflictException(
          `Color "${item.name}" already exists for this product`,
        );
      }
    }

    // Create all
    const createdColors = await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.productColor.create({
          data: { ...item, productId },
        }),
      ),
    );

    return Array.isArray(dto) ? createdColors : createdColors[0];
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
