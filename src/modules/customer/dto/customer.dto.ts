import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsEnum,
  IsDateString,
  IsArray,
} from 'class-validator';

export enum CustomerType {
  BUSINESS = 'BUSINESS',
  PERSONAL = 'PERSONAL',
}

export class CreateCustomerDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '+1234567890' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ enum: CustomerType, example: CustomerType.PERSONAL })
  @IsEnum(CustomerType)
  @IsNotEmpty()
  customerType: CustomerType;

  @ApiPropertyOptional({ example: 'English' })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiPropertyOptional({ example: 'https://example.com' })
  @IsString()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({ example: 'Acme Corp' })
  @IsString()
  @IsOptional()
  companyName?: string;

  @ApiPropertyOptional({ example: 'TAX-12345' })
  @IsString()
  @IsOptional()
  taxId?: string;

  @ApiPropertyOptional({ example: 'secondary@example.com' })
  @IsEmail()
  @IsOptional()
  secondaryEmail?: string;

  @ApiPropertyOptional({ example: '+0987654321' })
  @IsString()
  @IsOptional()
  secondaryPhone?: string;

  @ApiPropertyOptional({ example: '123 Main St' })
  @IsString()
  @IsOptional()
  street?: string;

  @ApiPropertyOptional({ example: 'New York' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: 'NY' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({ example: '10001' })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiPropertyOptional({ example: 'USA' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ example: ['vip', 'wholesale'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ example: 'Preferred customer, always pays on time.' })
  @IsString()
  @IsOptional()
  notes?: string;

  // Personal customer fields
  @ApiPropertyOptional({ example: 'Resale' })
  @IsString()
  @IsOptional()
  orderPurpose?: string;

  @ApiPropertyOptional({ example: 'Wedding' })
  @IsString()
  @IsOptional()
  eventType?: string;

  @ApiPropertyOptional({ example: '2025-12-25T00:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  eventDate?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/photo.jpg' })
  @IsString()
  @IsOptional()
  profileImage?: string;
}

export class UpdateCustomerDto {
  @ApiPropertyOptional({ example: 'Jane' })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Smith' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiPropertyOptional({ example: 'jane.smith@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ enum: CustomerType })
  @IsEnum(CustomerType)
  @IsOptional()
  customerType?: CustomerType;

  @ApiPropertyOptional({ example: 'French' })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiPropertyOptional({ example: 'https://newsite.com' })
  @IsString()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({ example: 'New Corp' })
  @IsString()
  @IsOptional()
  companyName?: string;

  @ApiPropertyOptional({ example: 'TAX-99999' })
  @IsString()
  @IsOptional()
  taxId?: string;

  @ApiPropertyOptional({ example: 'other@example.com' })
  @IsEmail()
  @IsOptional()
  secondaryEmail?: string;

  @ApiPropertyOptional({ example: '+1111111111' })
  @IsString()
  @IsOptional()
  secondaryPhone?: string;

  @ApiPropertyOptional({ example: '456 Elm St' })
  @IsString()
  @IsOptional()
  street?: string;

  @ApiPropertyOptional({ example: 'Boston' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: 'MA' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({ example: '02101' })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiPropertyOptional({ example: 'Canada' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ example: ['retail'], type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ example: 'Updated notes.' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ example: 'Personal Use' })
  @IsString()
  @IsOptional()
  orderPurpose?: string;

  @ApiPropertyOptional({ example: 'Birthday' })
  @IsString()
  @IsOptional()
  eventType?: string;

  @ApiPropertyOptional({ example: '2026-06-01T00:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  eventDate?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/new-photo.jpg' })
  @IsString()
  @IsOptional()
  profileImage?: string;
}
