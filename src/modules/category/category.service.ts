import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    const existing = await this.prisma.category.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException(
        `Category with name "${dto.name}" already exists`,
      );
    }
    return this.prisma.category.create({ data: dto });
  }

  async findAll() {
    return this.prisma.category.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category || category.isDeleted) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOne(id);
    if (dto.name) {
      const existing = await this.prisma.category.findUnique({
        where: { name: dto.name },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Category with name "${dto.name}" already exists`,
        );
      }
    }
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.category.update({
      where: { id },
      data: { isDeleted: true },
    });
    return { message: 'Category deleted successfully', id };
  }
}
