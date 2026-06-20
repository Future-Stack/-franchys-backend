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
  constructor(private readonly productService: ProductService) {}

  // ─── Product Endpoints ───────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create a new product (optionally with colors)' })
  create(@Body() dto: CreateProductDto) {
    return this.productService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all products (with brand, category, colors)' })
  findAll() {
    return this.productService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by ID' })
  findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a product by ID' })
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a product by ID' })
  remove(@Param('id') id: string) {
    return this.productService.remove(id);
  }

  // ─── Product Color Endpoints ─────────────────────────────────────────────────

  @Post(':id/colors')
  @ApiOperation({ summary: 'Add a color to a product' })
  addColor(@Param('id') id: string, @Body() dto: CreateProductColorDto) {
    return this.productService.addColor(id, dto);
  }

  @Get(':id/colors')
  @ApiOperation({ summary: 'Get all colors for a product' })
  findAllColors(@Param('id') id: string) {
    return this.productService.findAllColors(id);
  }

  @Patch(':id/colors/:colorId')
  @ApiOperation({ summary: 'Update a specific color of a product' })
  updateColor(
    @Param('id') id: string,
    @Param('colorId') colorId: string,
    @Body() dto: UpdateProductColorDto,
  ) {
    return this.productService.updateColor(id, colorId, dto);
  }

  @Delete(':id/colors/:colorId')
  @ApiOperation({ summary: 'Remove a specific color from a product' })
  removeColor(@Param('id') id: string, @Param('colorId') colorId: string) {
    return this.productService.removeColor(id, colorId);
  }
}
