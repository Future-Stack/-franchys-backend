import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateProductDto,
  UpdateProductDto,
  CreateProductColorDto,
  UpdateProductColorDto,
  GetProductsDto,
} from './dto/product.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class ProductService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}
  private async resolveBrand(
    brandId?: string,
    brandName?: string,
  ): Promise<string> {
    const cleanId = brandId?.trim();
    const cleanName = brandName?.trim();

    const isIdOther = cleanId?.toLowerCase() === 'other';
    const isNameOther = cleanName?.toLowerCase() === 'other';

    if (isIdOther || isNameOther) {
      const customName = isNameOther ? undefined : cleanName;
      if (!customName || customName.toLowerCase() === 'other') {
        throw new BadRequestException(
          'Brand name is required when brand is set to "other"',
        );
      }
      const existing = await this.prisma.brand.findFirst({
        where: { name: { equals: customName, mode: 'insensitive' } },
      });
      if (existing) {
        return existing.id;
      }
      try {
        const created = await this.prisma.brand.create({
          data: { name: customName },
        });
        if (created?.id) {
          return created.id;
        }
      } catch {}
      return customName;
    }

    if (cleanName) {
      const existing = await this.prisma.brand.findFirst({
        where: { name: { equals: cleanName, mode: 'insensitive' } },
      });
      if (existing) {
        return existing.id;
      }
      try {
        const created = await this.prisma.brand.create({
          data: { name: cleanName },
        });
        if (created?.id) {
          return created.id;
        }
      } catch {}
      return cleanName;
    }

    if (cleanId) {
      const existingById = await this.prisma.brand.findUnique({
        where: { id: cleanId },
      });
      if (existingById) {
        return existingById.id;
      }
      const existingByName = await this.prisma.brand.findFirst({
        where: { name: { equals: cleanId, mode: 'insensitive' } },
      });
      if (existingByName) {
        return existingByName.id;
      }
      try {
        const created = await this.prisma.brand.create({
          data: { name: cleanId },
        });
        if (created?.id) {
          return created.id;
        }
      } catch {}
      return cleanId;
    }

    throw new BadRequestException('Brand ID or brand name is required');
  }

  private async resolveCategory(
    categoryId?: string,
    categoryName?: string,
    category?: string,
  ): Promise<string> {
    const cleanId = categoryId?.trim();
    const cleanName = (categoryName || category)?.trim();

    if (!cleanId && !cleanName) {
      throw new BadRequestException(
        'Category ID or category name is required',
      );
    }

    const isIdOther = cleanId?.toLowerCase() === 'other';
    const isNameOther = cleanName?.toLowerCase() === 'other';

    if (isIdOther || isNameOther) {
      const customName = isNameOther ? undefined : cleanName;
      if (!customName || customName.toLowerCase() === 'other') {
        throw new BadRequestException(
          'Category name is required when category is set to "other"',
        );
      }
      const existing = await this.prisma.category.findFirst({
        where: { name: { equals: customName, mode: 'insensitive' } },
      });
      if (existing) {
        return existing.id;
      }
      try {
        const created = await this.prisma.category.create({
          data: { name: customName },
        });
        if (created?.id) {
          return created.id;
        }
      } catch {}
      return customName;
    }

    if (cleanName) {
      const existing = await this.prisma.category.findFirst({
        where: { name: { equals: cleanName, mode: 'insensitive' } },
      });
      if (existing) {
        return existing.id;
      }
      try {
        const created = await this.prisma.category.create({
          data: { name: cleanName },
        });
        if (created?.id) {
          return created.id;
        }
      } catch {}
      return cleanName;
    }

    if (cleanId) {
      const existingById = await this.prisma.category.findUnique({
        where: { id: cleanId },
      });
      if (existingById) {
        return existingById.id;
      }
      const existingByName = await this.prisma.category.findFirst({
        where: { name: { equals: cleanId, mode: 'insensitive' } },
      });
      if (existingByName) {
        return existingByName.id;
      }
      try {
        const created = await this.prisma.category.create({
          data: { name: cleanId },
        });
        if (created?.id) {
          return created.id;
        }
      } catch {}
      return cleanId;
    }

    throw new BadRequestException('Category ID or category name is required');
  }

  // ─── Product CRUD ────────────────────────────────────────────────────────────

  async create(dto: CreateProductDto, files?: Express.Multer.File[]) {
    const {
      colors,
      category,
      categoryId,
      categoryName,
      brandId,
      brandName,
      ...productData
    } = dto as any;
    delete productData.images;

    const resolvedBrandId = await this.resolveBrand(brandId, brandName);
    const resolvedCategoryId = await this.resolveCategory(
      categoryId,
      categoryName,
      category,
    );

    let imagePaths: string[] = [];
    if (files && files.length > 0) {
      imagePaths = await this.cloudinaryService.uploadMultipleFiles(files);
    }

    return this.prisma.product.create({
      data: {
        ...productData,
        categoryId: resolvedCategoryId,
        brandId: resolvedBrandId,
        images: imagePaths,
        colors: colors?.length ? { create: colors } : undefined,
      },
      include: { colors: true, brand: true, category: true },
    });
  }

  async findAll(query?: GetProductsDto) {
    const {
      page = 1,
      limit = 10,
      search,
      categoryId,
      brandId,
      color,
      size,
    } = query || {};
    const skip = (page - 1) * limit;

    const where: any = { isDeleted: false };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (brandId) {
      where.brandId = brandId;
    }

    if (color) {
      where.colors = {
        some: { name: { contains: color, mode: 'insensitive' } },
      };
    }

    if (size) {
      where.availableSizes = { has: size };
    }

    if (search) {
      where.OR = [
        { productName: { contains: search, mode: 'insensitive' } },
        { itemNo: { contains: search, mode: 'insensitive' } },
        { material: { contains: search, mode: 'insensitive' } },
        { style: { contains: search, mode: 'insensitive' } },
        { category: { name: { contains: search, mode: 'insensitive' } } },
        { brand: { name: { contains: search, mode: 'insensitive' } } },
        {
          colors: { some: { name: { contains: search, mode: 'insensitive' } } },
        },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: { colors: true, brand: true, category: true },
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

  async autocomplete(search?: string) {
    const where: any = { isDeleted: false };

    if (search && search.trim() !== '') {
      const term = search.trim();
      where.OR = [
        { productName: { contains: term, mode: 'insensitive' } },
        { itemNo: { contains: term, mode: 'insensitive' } },
        { style: { contains: term, mode: 'insensitive' } },
        { material: { contains: term, mode: 'insensitive' } },
        { category: { name: { contains: term, mode: 'insensitive' } } },
        { brand: { name: { contains: term, mode: 'insensitive' } } },
        { colors: { some: { name: { contains: term, mode: 'insensitive' } } } },
      ];
    }

    const products = await this.prisma.product.findMany({
      where,
      take: 50,
      include: { colors: true, category: true, brand: true },
      orderBy: { createdAt: 'desc' },
    });

    const results: any[] = [];

    for (const prod of products) {
      if (prod.colors && prod.colors.length > 0) {
        for (const colorObj of prod.colors) {
          const labelParts = [
            prod.productName,
            colorObj.name,
            prod.brand?.name,
            prod.style,
            prod.itemNo,
          ].filter((p): p is string => Boolean(p && String(p).trim() !== ''));

          results.push({
            label: labelParts.join(' - '),
            productId: prod.id,
            productName: prod.productName,
            itemNo: prod.itemNo,
            style: prod.style,
            price: prod.price,
            unitPrice: prod.price,
            brandId: prod.brandId,
            brandName: prod.brand?.name || null,
            categoryId: prod.categoryId,
            categoryName: prod.category?.name || null,
            colorId: colorObj.id,
            color: colorObj.name,
            colorCode: colorObj.code,
            availableSizes: prod.availableSizes,
            images: prod.images,
          });
        }
      } else {
        const labelParts = [
          prod.productName,
          prod.brand?.name,
          prod.style,
          prod.itemNo,
        ].filter((p): p is string => Boolean(p && String(p).trim() !== ''));

        results.push({
          label: labelParts.join(' - '),
          productId: prod.id,
          productName: prod.productName,
          itemNo: prod.itemNo,
          style: prod.style,
          price: prod.price,
          unitPrice: prod.price,
          brandId: prod.brandId,
          brandName: prod.brand?.name || null,
          categoryId: prod.categoryId,
          categoryName: prod.category?.name || null,
          colorId: null,
          color: null,
          colorCode: null,
          availableSizes: prod.availableSizes,
          images: prod.images,
        });
      }
    }

    return results;
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { colors: true, brand: true, category: true },
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
    const {
      existingImages,
      category,
      categoryId,
      categoryName,
      brandId,
      brandName,
      ...updateData
    } = dto as any;
    delete updateData.images;
    const updateInput: any = { ...updateData };

    if (
      categoryId !== undefined ||
      category !== undefined ||
      categoryName !== undefined
    ) {
      updateInput.categoryId = await this.resolveCategory(
        categoryId,
        categoryName,
        category,
      );
    }

    if (brandId || brandName) {
      updateInput.brandId = await this.resolveBrand(brandId, brandName);
    }

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
      include: { colors: true, brand: true, category: true },
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
