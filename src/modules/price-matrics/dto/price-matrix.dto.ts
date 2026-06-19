import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsInt, IsNumber, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePriceTierDto {
  @ApiProperty({ description: 'Quantity threshold for the tier', example: 10 })
  @IsInt()
  @IsNotEmpty()
  quantity: number;

  @ApiProperty({ description: 'Base price of the tier', example: 100.00 })
  @IsNumber()
  @IsNotEmpty()
  basePrice: number;

  @ApiProperty({ description: 'Markup percentage or amount', example: 10.00 })
  @IsNumber()
  @IsNotEmpty()
  markup: number;
}

export class CreatePriceMatrixDto {
  @ApiProperty({ description: 'Name of the price matrix', example: 'Wholesale Tier' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Type of pricing (e.g., percentage, fixed)', example: 'percentage' })
  @IsString()
  @IsNotEmpty()
  priceType: string;

  @ApiProperty({ description: 'List of price tiers to create with the matrix', type: [CreatePriceTierDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePriceTierDto)
  @IsOptional()
  priceTiers?: CreatePriceTierDto[];
}

export class UpdatePriceTierDto {
  @ApiPropertyOptional({ description: 'The ID of the price tier (provide if updating existing tier)' })
  @IsString()
  @IsOptional()
  priceTierId?: string;

  @ApiProperty({ description: 'Quantity threshold for the tier', example: 10 })
  @IsInt()
  @IsNotEmpty()
  quantity: number;

  @ApiProperty({ description: 'Base price of the tier', example: 100.00 })
  @IsNumber()
  @IsNotEmpty()
  basePrice: number;

  @ApiProperty({ description: 'Markup percentage or amount', example: 10.00 })
  @IsNumber()
  @IsNotEmpty()
  markup: number;
}

export class UpdatePriceMatrixDto {
  @ApiPropertyOptional({ description: 'Name of the price matrix', example: 'Wholesale Tier' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Type of pricing', example: 'percentage' })
  @IsString()
  @IsOptional()
  priceType?: string;
}
