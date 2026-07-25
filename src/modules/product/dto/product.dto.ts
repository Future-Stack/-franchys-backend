import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type, Transform, plainToInstance } from 'class-transformer';

export class CreateProductColorDto {
  @ApiProperty({ description: 'Color name', example: 'Midnight Black' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Hex color code', example: '#000000' })
  @IsString()
  @IsOptional()
  code?: string;
}

export class CreateProductDto {
  @ApiProperty({
    description: 'Product name',
    example: 'Classic Leather Sneakers',
  })
  @IsString()
  @IsNotEmpty()
  productName: string;

  @ApiPropertyOptional({
    description: 'Category name',
    example: 'Footwear',
  })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({
    description: 'Brand ID (UUID) or "other"',
    example: 'uuid-here',
  })
  @IsString()
  @IsOptional()
  brandId?: string;

  @ApiPropertyOptional({
    description:
      'Custom brand name (used when brandId is omitted, "other", or custom)',
    example: 'Nike',
  })
  @IsString()
  @IsOptional()
  brandName?: string;

  @ApiProperty({ description: 'Price (e.g. 99.99)', example: '99.99' })
  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  price: string | number;

  @ApiPropertyOptional({ description: 'Item/SKU number', example: 'SKU-001' })
  @IsString()
  @IsOptional()
  itemNo?: string;

  @ApiPropertyOptional({
    description: 'Material',
    example: 'Full-Grain Leather',
  })
  @IsString()
  @IsOptional()
  material?: string;

  @ApiPropertyOptional({ description: 'Weight in kg', example: 0.8 })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @IsOptional()
  weight?: number;

  @ApiPropertyOptional({ description: 'Style', example: 'Casual' })
  @IsString()
  @IsOptional()
  style?: string;

  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    description: 'Image files',
  })
  @IsOptional()
  images?: any[];

  @ApiPropertyOptional({
    type: 'string',
    description:
      'Available sizes as JSON string. Example: ["S", "M", "L", "XL"]',
  })
  @Transform(({ value }) => {
    if (!value || typeof value !== 'string' || value.trim() === '')
      return undefined;
    try {
      return JSON.parse(value);
    } catch {
      const parts = value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      return parts.length > 0 ? parts : undefined;
    }
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  availableSizes?: string[];

  @ApiPropertyOptional({
    type: 'string',
    description:
      'Product colors as JSON string. Example: [{"name": "Midnight Black", "code": "#000"}]',
  })
  @Transform(({ value }) => {
    if (!value || typeof value !== 'string' || value.trim() === '')
      return undefined;
    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) return [];
      const uniqueNames = new Set();
      const uniqueColors = parsed.filter((color) => {
        if (!color.name) return true;
        if (uniqueNames.has(color.name)) return false;
        uniqueNames.add(color.name);
        return true;
      });
      return plainToInstance(CreateProductColorDto, uniqueColors);
    } catch {
      return [];
    }
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductColorDto)
  @IsOptional()
  colors?: CreateProductColorDto[];
}

export class UpdateProductDto {
  @ApiPropertyOptional({
    description: 'Product name',
    example: 'Updated Sneakers',
  })
  @IsString()
  @IsOptional()
  productName?: string;

  @ApiPropertyOptional({
    description: 'Category name',
    example: 'Footwear',
  })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({
    description: 'Brand ID (UUID) or "other"',
    example: 'uuid-here',
  })
  @IsString()
  @IsOptional()
  brandId?: string;

  @ApiPropertyOptional({
    description:
      'Custom brand name (used when brandId is omitted, "other", or custom)',
    example: 'Nike',
  })
  @IsString()
  @IsOptional()
  brandName?: string;

  @ApiPropertyOptional({ description: 'Price', example: '129.99' })
  @Transform(({ value }) => Number(value))
  @IsOptional()
  price?: string | number;

  @ApiPropertyOptional({ description: 'Item/SKU number', example: 'SKU-002' })
  @IsString()
  @IsOptional()
  itemNo?: string;

  @ApiPropertyOptional({ description: 'Material', example: 'Canvas' })
  @IsString()
  @IsOptional()
  material?: string;

  @ApiPropertyOptional({ description: 'Weight in kg', example: 0.5 })
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @IsOptional()
  weight?: number;

  @ApiPropertyOptional({ description: 'Style', example: 'Sport' })
  @IsString()
  @IsOptional()
  style?: string;

  @ApiPropertyOptional({
    type: 'string',
    description:
      'Existing image URLs as JSON string or comma-separated string. example(["img1.jpg", "img2.jpg"])',
  })
  @Transform(({ value }) => {
    if (!value || typeof value !== 'string' || value.trim() === '')
      return undefined;
    try {
      return JSON.parse(value);
    } catch {
      const parts = value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      return parts.length > 0 ? parts : undefined;
    }
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  existingImages?: string[];

  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    description: 'Image files',
  })
  @IsOptional()
  images?: any[];

  @ApiPropertyOptional({
    type: 'string',
    description:
      'Available sizes as JSON string. Example: ["S", "M", "L", "XL"]',
  })
  @Transform(({ value }) => {
    if (!value || typeof value !== 'string' || value.trim() === '')
      return undefined;
    try {
      return JSON.parse(value);
    } catch {
      const parts = value
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      return parts.length > 0 ? parts : undefined;
    }
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  availableSizes?: string[];

  @ApiPropertyOptional({
    description: 'Soft delete flag. Send "true" or "false"',
    example: false,
    type: 'boolean',
  })
  @Transform(({ value }) => {
    if (value === 'true' || value === true || value === 1 || value === '1')
      return true;
    if (value === 'false' || value === false || value === 0 || value === '0')
      return false;
    return undefined; // ignore empty strings or invalid values
  })
  @IsOptional()
  isDeleted?: boolean;
}

export class UpdateProductColorDto {
  @ApiPropertyOptional({ description: 'Color name', example: 'Arctic White' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Hex color code', example: '#FFFFFF' })
  @IsString()
  @IsOptional()
  code?: string;
}

export class GetProductsDto {
  @ApiPropertyOptional({ description: 'Search query string' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Page number (starting from 1)',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page (max 100)',
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Filter by category ID' })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Filter by brand ID' })
  @IsOptional()
  @IsString()
  brandId?: string;

  @ApiPropertyOptional({ description: 'Filter/search by color name' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({
    description: 'Filter/search by size (e.g. S, M, L, XL)',
  })
  @IsOptional()
  @IsString()
  size?: string;
}
