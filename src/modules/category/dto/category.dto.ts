import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ description: 'Category name (must be unique)', example: 'Apparel' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Category description', example: 'Clothing and wearables' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({ description: 'Category name (must be unique)', example: 'Footwear' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Category description', example: 'Shoes and sandals' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Soft delete flag', example: false })
  @IsBoolean()
  @IsOptional()
  isDeleted?: boolean;
}
