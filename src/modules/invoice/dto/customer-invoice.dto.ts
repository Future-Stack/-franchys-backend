import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  IsPositive,
  IsInt,
  Min,
  IsDateString,
  IsEnum,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InvoiceStatus } from '@prisma/client';

export class InvoiceLineItemDto {
  @ApiProperty({ example: 'Custom Print Order — 50 shirts' })
  @IsString()
  description: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 7290.0 })
  @IsNumber()
  @IsPositive()
  unitPrice: number;
}

export class CreateCustomerInvoiceDto {
  @ApiProperty({ description: 'Customer ID' })
  @IsString()
  customerId: string;

  @ApiPropertyOptional({ description: 'Quote ID this invoice is based on' })
  @IsString()
  @IsOptional()
  quoteId?: string;

  @ApiPropertyOptional({
    description: 'Payment term ID (e.g. Net 30, 50% Deposit)',
  })
  @IsString()
  @IsOptional()
  paymentTermId?: string;

  @ApiPropertyOptional({ description: 'Tax rate percentage', example: 7.0 })
  @IsNumber()
  @IsOptional()
  taxRate?: number;

  @ApiPropertyOptional({ description: 'Discount amount', example: 0 })
  @IsNumber()
  @IsOptional()
  discount?: number;

  @ApiPropertyOptional({ description: 'Due date (ISO string)' })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Admin notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ type: [InvoiceLineItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineItemDto)
  lineItems: InvoiceLineItemDto[];
}

export class UpdateCustomerInvoiceDto {
  @ApiPropertyOptional({ description: 'Payment term ID', nullable: true })
  @ValidateIf((o) => o.paymentTermId !== null)
  @IsString()
  @IsOptional()
  paymentTermId?: string | null;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  taxRate?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  discount?: number;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ type: [InvoiceLineItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceLineItemDto)
  @IsOptional()
  lineItems?: InvoiceLineItemDto[];
}

export class SendInvoiceDto {
  @ApiPropertyOptional({
    description: 'Send via email',
    example: true,
    default: true,
  })
  @IsOptional()
  sendEmail?: boolean;

  @ApiPropertyOptional({
    description: 'Send via WhatsApp',
    example: true,
    default: true,
  })
  @IsOptional()
  sendWhatsApp?: boolean;
}

export class GetInvoicesDto {
  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ description: 'Filter by customer ID' })
  @IsString()
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Filter by quote ID' })
  @IsString()
  @IsOptional()
  quoteId?: string;

  @ApiPropertyOptional({ enum: InvoiceStatus })
  @IsEnum(InvoiceStatus)
  @IsOptional()
  status?: InvoiceStatus;
}
