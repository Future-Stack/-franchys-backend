import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  IsDecimal,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

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
  @ApiProperty({ description: 'Product name', example: 'Classic Leather Sneakers' })
  @IsString()
  @IsNotEmpty()
  productName: string;

  @ApiProperty({ description: 'Category ID', example: 'uuid-here' })
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @ApiProperty({ description: 'Brand ID', example: 'uuid-here' })
  @IsString()
  @IsNotEmpty()
  brandId: string;

  @ApiProperty({ description: 'Price (e.g. 99.99)', example: '99.99' })
  @IsNotEmpty()
  @Transform(({ value }) => Number(value))
  price: string | number;

  @ApiPropertyOptional({ description: 'Item/SKU number', example: 'SKU-001' })
  @IsString()
  @IsOptional()
  itemNo?: string;

  @ApiPropertyOptional({ description: 'Material', example: 'Full-Grain Leather' })
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

  @ApiPropertyOptional({ type: 'array', items: { type: 'string', format: 'binary' }, description: 'Image files' })
  @IsOptional()
  images?: any[];

  @ApiPropertyOptional({ type: 'string', description: 'Available sizes as JSON string. Example: ["S", "M", "L", "XL"]' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (e) {
        return value.split(',').map(s => s.trim());
      }
    }
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  availableSizes?: string[];

  @ApiPropertyOptional({ type: 'string', description: 'Product colors as JSON string. Example: [{"name": "Midnight Black", "code": "#000"}]' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (e) {
        return [];
      }
    }
    return value;
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductColorDto)
  @IsOptional()
  colors?: CreateProductColorDto[];
}

export class UpdateProductDto {
  @ApiPropertyOptional({ description: 'Product name', example: 'Updated Sneakers' })
  @IsString()
  @IsOptional()
  productName?: string;

  @ApiPropertyOptional({ description: 'Category ID', example: 'uuid-here' })
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Brand ID', example: 'uuid-here' })
  @IsString()
  @IsOptional()
  brandId?: string;

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

  @ApiPropertyOptional({ type: 'array', items: { type: 'string', format: 'binary' }, description: 'Image files' })
  @IsOptional()
  images?: any[];

  @ApiPropertyOptional({ type: 'string', description: 'Available sizes as JSON string. Example: ["S", "M", "L", "XL"]' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (e) {
        return value.split(',').map(s => s.trim());
      }
    }
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  availableSizes?: string[];

  @ApiPropertyOptional({ type: 'string', description: 'Product colors as JSON string. Example: [{"name": "Midnight Black", "code": "#000"}]' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (e) {
        return [];
      }
    }
    return value;
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductColorDto)
  @IsOptional()
  colors?: CreateProductColorDto[];

  @ApiPropertyOptional({ description: 'Soft delete flag', example: false })
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
