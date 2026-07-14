import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsBoolean,
  IsOptional,
} from 'class-validator';

export class CreateInvoiceFeeDto {
  @ApiProperty({ description: 'Name of the fee', example: 'Shipping Fee' })
  @IsString()
  @IsNotEmpty()
  feeName: string;

  @ApiProperty({ description: 'Amount of the fee', example: 15 })
  @IsInt()
  @IsNotEmpty()
  amount: number;

  @ApiPropertyOptional({
    description: 'Indicates if this fee is tax-related',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isTax?: boolean;

  @ApiPropertyOptional({
    description: 'Indicates if this fee is automatically added by default',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isDefaultAutoAdd?: boolean;
}

export class UpdateInvoiceFeeDto {
  @ApiPropertyOptional({
    description: 'Name of the fee',
    example: 'Shipping Fee',
  })
  @IsString()
  @IsOptional()
  feeName?: string;

  @ApiPropertyOptional({ description: 'Amount of the fee', example: 15 })
  @IsInt()
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({
    description: 'Indicates if this fee is tax-related',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  isTax?: boolean;

  @ApiPropertyOptional({
    description: 'Indicates if this fee is automatically added by default',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  isDefaultAutoAdd?: boolean;
}
