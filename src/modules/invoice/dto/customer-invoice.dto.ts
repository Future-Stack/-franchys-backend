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
import { Type, Transform } from 'class-transformer';
import { InvoiceStatus } from '@prisma/client';

export enum InvoiceSortBy {
  AMOUNT_DUE = 'amountDue',
  AMOUNT_PAID = 'amountPaid',
  TOTAL = 'total',
  CREATED_AT = 'createdAt',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

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

  @ApiPropertyOptional({
    description:
      'Search across invoiceNumber, quoteNumber, customer firstName/lastName, and companyName',
    example: 'INV-1001',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    enum: InvoiceSortBy,
    description:
      'Field to sort by: "amountDue", "amountPaid", "total", or "createdAt"',
    example: 'amountDue',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const v = value.trim().toLowerCase();
      if (v === 'amountdue' || v === 'amount_due')
        return InvoiceSortBy.AMOUNT_DUE;
      if (v === 'amountpaid' || v === 'amount_paid')
        return InvoiceSortBy.AMOUNT_PAID;
      if (v === 'total') return InvoiceSortBy.TOTAL;
      if (v === 'createdat' || v === 'created_at')
        return InvoiceSortBy.CREATED_AT;
    }
    return value;
  })
  @IsEnum(InvoiceSortBy)
  sortBy?: InvoiceSortBy;

  @ApiPropertyOptional({
    enum: SortOrder,
    description: 'Sort direction: "asc" or "desc"',
    default: SortOrder.DESC,
    example: 'desc',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const v = value.trim().toLowerCase();
      if (v === 'asc') return SortOrder.ASC;
      if (v === 'desc') return SortOrder.DESC;
    }
    return value;
  })
  @IsEnum(SortOrder)
  sortOrder?: SortOrder;
}

export class GetPaymentsDto {
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

  @ApiPropertyOptional({
    description: 'Filter by payment status (Completed, Pending, Failed)',
    example: 'Pending',
    enum: ['Completed', 'Pending', 'Failed'],
  })
  @IsString()
  @IsOptional()
  status?: string;
}
