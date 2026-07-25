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
  BadRequestException,
  Query,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiExtraModels,
} from '@nestjs/swagger';
import { ProductService } from './product.service';
import {
  CreateProductDto,
  UpdateProductDto,
  CreateProductColorDto,
  UpdateProductColorDto,
  GetProductsDto,
} from './dto/product.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ApiQuery } from '@nestjs/swagger';

@ApiTags('Product')
@ApiBearerAuth()
@ApiExtraModels(CreateProductColorDto)
@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

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
    };
  }

  @Get('autocomplete')
  @ApiOperation({
    summary:
      'Autocomplete dropdown list for line items search (returns product-color variants formatted as "Title - Color - Brand - Style# - Item#")',
  })
  @ApiQuery({ name: 'search', required: false })
  async autocomplete(@Query('search') search?: string) {
    const data = await this.productService.autocomplete(search);
    return {
      message: 'Product autocomplete options fetched successfully',
      data,
    };
  }

  @Get()
  @ApiOperation({
    summary:
      'Get all products with pagination, search, and filters (category, brand, color, size)',
  })
  async findAll(@Query() query: GetProductsDto) {
    const data = await this.productService.findAll(query);
    return {
      message: 'Products fetched successfully',
      ...data,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by ID' })
  async findOne(@Param('id') id: string) {
    const data = await this.productService.findOne(id);
    return {
      message: 'Product fetched successfully',
      data,
    };
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
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a product by ID' })
  async remove(@Param('id') id: string) {
    const data = await this.productService.remove(id);
    return {
      message: 'Product deleted successfully',
      data,
    };
  }

  // ─── Product Color Endpoints ─────────────────────────────────────────────────

  @Post(':id/colors')
  @ApiOperation({ summary: 'Add multiple colors to a product' })
  @ApiBody({
    type: [CreateProductColorDto],
    description: 'Array of colors to add to the product',
  })
  async addColor(
    @Param('id') id: string,
    @Body() dto: CreateProductColorDto[],
  ) {
    const isArray = Array.isArray(dto);
    const items = isArray ? dto : [dto];

    for (const item of items) {
      const instance = plainToInstance(CreateProductColorDto, item);
      const errors = await validate(instance);
      if (errors.length > 0) {
        throw new BadRequestException(errors);
      }
    }

    const data = await this.productService.addColor(id, dto);
    return {
      message: isArray
        ? 'Colors added successfully'
        : 'Color added successfully',
      data,
    };
  }

  @Get(':id/colors')
  @ApiOperation({ summary: 'Get all colors for a product' })
  async findAllColors(@Param('id') id: string) {
    const data = await this.productService.findAllColors(id);
    return {
      message: 'Colors fetched successfully',
      data,
    };
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
    };
  }

  @Delete(':id/colors/:colorId')
  @ApiOperation({ summary: 'Remove a specific color from a product' })
  async removeColor(
    @Param('id') id: string,
    @Param('colorId') colorId: string,
  ) {
    const data = await this.productService.removeColor(id, colorId);
    return {
      message: 'Color deleted successfully',
      data,
    };
  }
}
