import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { ProductService } from './product.service';
import {
  CreateProductDto,
  UpdateProductDto,
  CreateProductColorDto,
  UpdateProductColorDto,
} from './dto/product.dto';

@ApiTags('Product')
@ApiBearerAuth()
@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) { }

  // ─── Product Endpoints ───────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create a new product (optionally with colors)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      storage: memoryStorage(),
    }),
  )
  async create(
    @Body() dto: CreateProductDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const data = await this.productService.create(dto, files);
    return {
      message: 'Product created successfully',
      data,
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get all products (with brand, category, colors)' })
  async findAll() {
    const data = await this.productService.findAll();
    return {
      message: 'Products fetched successfully',
      data,
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by ID' })
  async findOne(@Param('id') id: string) {
    const data = await this.productService.findOne(id);
    return {
      message: 'Product fetched successfully',
      data,
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a product by ID' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      storage: memoryStorage(),
    }),
  )
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const data = await this.productService.update(id, dto, files);
    return {
      message: 'Product updated successfully',
      data,
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a product by ID' })
  async remove(@Param('id') id: string) {
    const data = await this.productService.remove(id);
    return {
      message: 'Product deleted successfully',
      data,
    }
  }

  // ─── Product Color Endpoints ─────────────────────────────────────────────────

  @Post(':id/colors')
  @ApiOperation({ summary: 'Add a color to a product' })
  async addColor(@Param('id') id: string, @Body() dto: CreateProductColorDto) {
    const data = await this.productService.addColor(id, dto);
    return {
      message: 'Color added successfully',
      data,
    }
  }

  @Get(':id/colors')
  @ApiOperation({ summary: 'Get all colors for a product' })
  async findAllColors(@Param('id') id: string) {
    const data = await this.productService.findAllColors(id);
    return {
      message: 'Colors fetched successfully',
      data,
    }
  }

  @Patch(':id/colors/:colorId')
  @ApiOperation({ summary: 'Update a specific color of a product' })
  async updateColor(
    @Param('id') id: string,
    @Param('colorId') colorId: string,
    @Body() dto: UpdateProductColorDto,
  ) {
    const data = await this.productService.updateColor(id, colorId, dto);
    return {
      message: 'Color updated successfully',
      data,
    }
  }

  @Delete(':id/colors/:colorId')
  @ApiOperation({ summary: 'Remove a specific color from a product' })
  async removeColor(@Param('id') id: string, @Param('colorId') colorId: string) {
    const data = await this.productService.removeColor(id, colorId);
    return {
      message: 'Color deleted successfully',
      data,
    }
  }
}
