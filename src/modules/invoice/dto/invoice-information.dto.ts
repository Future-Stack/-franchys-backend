import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsOptional,
  IsBoolean,
  IsNumber,
} from 'class-validator';

export class UpdateInvoiceInformationDto {
  @ApiPropertyOptional({ description: 'Currency code', example: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ description: 'Language name', example: 'English' })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiPropertyOptional({ description: 'Invoice tax rate %', example: 7.0 })
  @IsNumber()
  @IsOptional()
  invoiceTaxRate?: number;

  @ApiPropertyOptional({ description: 'Invoice seed number', example: 1001 })
  @IsInt()
  @IsOptional()
  invoiceSeed?: number;

  @ApiPropertyOptional({
    description: 'Footer text shown on every invoice',
    example: 'Thank you for your business!',
  })
  @IsString()
  @IsOptional()
  invoiceCommentary?: string;

  @ApiPropertyOptional({
    description: 'Terms & Conditions text (shown on public invoice page)',
  })
  @IsString()
  @IsOptional()
  termsAndCondition?: string;

  @ApiPropertyOptional({
    description: 'Refund policy text (shown on public invoice page)',
  })
  @IsString()
  @IsOptional()
  refundPolicy?: string;

  @ApiPropertyOptional({
    description: 'Delivery policy text (shown on public invoice page)',
  })
  @IsString()
  @IsOptional()
  deliveryPolicy?: string;

  @ApiPropertyOptional({ description: 'Legacy payment terms text' })
  @IsString()
  @IsOptional()
  paymentTramsAndCondition?: string;

  @ApiPropertyOptional({
    description: 'Show total quantity field on invoice',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  showTotalQuantity?: boolean;

  @ApiPropertyOptional({
    description: 'Make imprint details visible to customers',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  makeImprintsVisible?: boolean;

  @ApiPropertyOptional({
    description: 'Show PO Number field on invoices',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  showPoNumber?: boolean;

  @ApiPropertyOptional({
    description: 'Printing layout for PDF',
    example: 'PORTRAIT',
    enum: ['PORTRAIT', 'LANDSCAPE'],
  })
  @IsString()
  @IsOptional()
  printingLayout?: string;

  @ApiPropertyOptional({
    description: 'Invoice access control for public links',
    example: 'ANYONE_WITH_LINK',
    enum: ['ANYONE_WITH_LINK', 'EMAIL_REQUIRED'],
  })
  @IsString()
  @IsOptional()
  invoicePrivacy?: string;
}
