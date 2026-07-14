import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateBrandDto {
  @ApiProperty({ description: 'Brand name (must be unique)', example: 'Nike' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Brand description',
    example: 'Just Do It',
  })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateBrandDto {
  @ApiPropertyOptional({
    description: 'Brand name (must be unique)',
    example: 'Adidas',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Brand description',
    example: 'Impossible is Nothing',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Soft delete flag', example: false })
  @IsBoolean()
  @IsOptional()
  isDeleted?: boolean;
}
