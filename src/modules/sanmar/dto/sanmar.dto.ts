import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SanMarProductSearchDto {
  @ApiPropertyOptional({
    description: 'Search term — matches style number, product name, color, brand, category',
    example: '8000',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Page number (1-based)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Results per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Filter by category', example: 'T-Shirts' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Filter by color name', example: 'Black' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ description: 'Filter by size (e.g. S, M, L, XL)', example: 'L' })
  @IsOptional()
  @IsString()
  size?: string;
}

export class SanMarAutocompleteDto {
  @ApiPropertyOptional({
    description: 'Search term — matches style number, product name, brand, color, category',
    example: '8000',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
