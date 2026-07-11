import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsEnum,
} from 'class-validator';
import { VendorStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVendorDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  companyName: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  contactName: string;

  @ApiPropertyOptional({ enum: VendorStatus, default: VendorStatus.ACTIVE })
  @IsOptional()
  @IsEnum(VendorStatus)
  status?: VendorStatus;

  @ApiProperty()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  fax: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  accountNumber: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  mainAddress: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  optionalAddress?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  city: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  state: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  country: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  zip: string;
}
