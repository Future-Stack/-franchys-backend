import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsNumber,
  IsArray,
  ValidateNested,
  IsOptional,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePriceTierDto {
  @ApiProperty({ description: 'Quantity threshold for the tier', example: 10 })
  @IsInt()
  @IsNotEmpty()
  quantity: number;

  @ApiPropertyOptional({
    description: 'Base price of the tier (fallback/single-column price)',
    example: 100.0,
  })
  @IsNumber()
  @IsOptional()
  basePrice?: number;

  @ApiProperty({ description: 'Markup percentage or amount', example: 10.0 })
  @IsNumber()
  @IsNotEmpty()
  markup: number;

  @ApiPropertyOptional({
    description:
      'Grid prices per column variable, e.g. { "1 Color": 3.50, "2 Colors": 4.20 }',
    example: { '1 Color': 3.5, '2 Colors': 4.2 },
  })
  @IsObject()
  @IsOptional()
  columnPrices?: Record<string, number>;
}

export class CreatePriceMatrixDto {
  @ApiProperty({
    description: 'Name of the price matrix',
    example: 'Wholesale Tier',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Type of pricing (e.g., percentage, fixed)',
    example: 'percentage',
  })
  @IsString()
  @IsNotEmpty()
  priceType: string;

  @ApiPropertyOptional({
    description: 'Column headers for 2D matrix (e.g. ["1 Color", "2 Colors"])',
    example: ['1 Color', '2 Colors', '3 Colors'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  columns?: string[];

  @ApiPropertyOptional({
    description: 'List of price tiers to create with the matrix',
    type: [CreatePriceTierDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePriceTierDto)
  @IsOptional()
  priceTiers?: CreatePriceTierDto[];
}

export class UpdatePriceTierDto {
  @ApiPropertyOptional({
    description: 'The ID of the price tier (provide if updating existing tier)',
  })
  @IsString()
  @IsOptional()
  priceTierId?: string;

  @ApiProperty({ description: 'Quantity threshold for the tier', example: 10 })
  @IsInt()
  @IsNotEmpty()
  quantity: number;

  @ApiPropertyOptional({
    description: 'Base price of the tier',
    example: 100.0,
  })
  @IsNumber()
  @IsOptional()
  basePrice?: number;

  @ApiProperty({ description: 'Markup percentage or amount', example: 10.0 })
  @IsNumber()
  @IsNotEmpty()
  markup: number;

  @ApiPropertyOptional({
    description: 'Grid prices per column variable',
    example: { '1 Color': 3.5, '2 Colors': 4.2 },
  })
  @IsObject()
  @IsOptional()
  columnPrices?: Record<string, number>;
}

export class UpdatePriceMatrixDto {
  @ApiPropertyOptional({
    description: 'Name of the price matrix',
    example: 'Wholesale Tier',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Type of pricing',
    example: 'percentage',
  })
  @IsString()
  @IsOptional()
  priceType?: string;

  @ApiPropertyOptional({
    description: 'Column headers for 2D matrix',
    example: ['1 Color', '2 Colors'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  columns?: string[];

  @ApiPropertyOptional({
    description: 'List of price tiers to replace/update in matrix',
    type: [CreatePriceTierDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePriceTierDto)
  @IsOptional()
  priceTiers?: CreatePriceTierDto[];
}
