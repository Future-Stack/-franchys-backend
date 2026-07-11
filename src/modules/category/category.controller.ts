import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CategoryService } from './category.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@ApiTags('Category')
@ApiBearerAuth()
@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new category' })
  async create(@Body() dto: CreateCategoryDto) {
    const data = await this.categoryService.create(dto);
    return {
      message: 'Category created successfully',
      data,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all categories' })
  async findAll() {
    const data = await this.categoryService.findAll();
    return {
      message: 'Categories fetched successfully',
      data,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a category by ID' })
  async findOne(@Param('id') id: string) {
    const data = await this.categoryService.findOne(id);
    return {
      message: 'Category fetched successfully',
      data,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a category by ID' })
  async update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    const data = await this.categoryService.update(id, dto);
    return {
      message: 'Category updated successfully',
      data,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a category by ID' })
  async remove(@Param('id') id: string) {
    const data = await this.categoryService.remove(id);
    return {
      message: 'Category deleted successfully',
      data,
    };
  }
}
