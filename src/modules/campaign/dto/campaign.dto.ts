import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
  IsArray,
} from 'class-validator';

export enum CampaignType {
  NEWSLETTER = 'NEWSLETTER',
  PROMOTION = 'PROMOTION',
  DISCOUNT = 'DISCOUNT',
}

export enum CampaignStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
}

export class CreateCampaignDto {
  @ApiProperty({ example: 'Spring Sale 2026' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ enum: CampaignType, example: CampaignType.PROMOTION })
  @IsEnum(CampaignType)
  @IsNotEmpty()
  type: CampaignType;

  @ApiPropertyOptional({ enum: CampaignStatus, example: CampaignStatus.DRAFT })
  @IsEnum(CampaignStatus)
  @IsOptional()
  status?: CampaignStatus;

  @ApiPropertyOptional({ example: 1000 })
  @IsNumber()
  @IsOptional()
  recipientsCount?: number;

  @ApiPropertyOptional({ example: 'Wholesale buyers' })
  @IsString()
  @IsOptional()
  targetAudience?: string;

  @ApiPropertyOptional({ example: 'SPRING26' })
  @IsString()
  @IsOptional()
  promoCode?: string;

  @ApiPropertyOptional({ example: 'percentage' })
  @IsString()
  @IsOptional()
  discountType?: string;

  @ApiPropertyOptional({ example: 15 })
  @IsNumber()
  @IsOptional()
  percentage?: number;

  @ApiPropertyOptional({ example: 150 })
  @IsNumber()
  @IsOptional()
  minOrderAmount?: number;

  @ApiPropertyOptional({ example: 500 })
  @IsNumber()
  @IsOptional()
  usageLimit?: number;

  @ApiPropertyOptional({ example: '2026-05-15T00:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-06-15T00:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ example: 'Apply code at checkout.' })
  @IsString()
  @IsOptional()
  termsCondition?: string;

  @ApiPropertyOptional({
    example: ['prod-uuid-1', 'prod-uuid-2'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  featuredProducts?: string[];
}

export class UpdateCampaignDto {
  @ApiPropertyOptional({ example: 'Spring Sale 2026' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ enum: CampaignType })
  @IsEnum(CampaignType)
  @IsOptional()
  type?: CampaignType;

  @ApiPropertyOptional({ enum: CampaignStatus })
  @IsEnum(CampaignStatus)
  @IsOptional()
  status?: CampaignStatus;

  @ApiPropertyOptional({ example: 1000 })
  @IsNumber()
  @IsOptional()
  recipientsCount?: number;

  @ApiPropertyOptional({ example: 'Wholesale buyers' })
  @IsString()
  @IsOptional()
  targetAudience?: string;

  @ApiPropertyOptional({ example: 'SPRING26' })
  @IsString()
  @IsOptional()
  promoCode?: string;

  @ApiPropertyOptional({ example: 'percentage' })
  @IsString()
  @IsOptional()
  discountType?: string;

  @ApiPropertyOptional({ example: 15 })
  @IsNumber()
  @IsOptional()
  percentage?: number;

  @ApiPropertyOptional({ example: 150 })
  @IsNumber()
  @IsOptional()
  minOrderAmount?: number;

  @ApiPropertyOptional({ example: 500 })
  @IsNumber()
  @IsOptional()
  usageLimit?: number;

  @ApiPropertyOptional({ example: '2026-05-15T00:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-06-15T00:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ example: 'Apply code at checkout.' })
  @IsString()
  @IsOptional()
  termsCondition?: string;

  @ApiPropertyOptional({
    example: ['prod-uuid-1', 'prod-uuid-2'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  featuredProducts?: string[];
}
