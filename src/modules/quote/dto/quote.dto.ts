import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
  IsArray,
  IsNumber,
  IsBoolean,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum QuoteStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  APPROVED = 'APPROVED',
  REVISION_REQUESTED = 'REVISION_REQUESTED',
  DECLINED = 'DECLINED',
}

export class CreateQuoteLineItemDto {
  @ApiPropertyOptional({ example: 'Group 1' })
  @IsString()
  @IsOptional()
  groupName?: string;

  @ApiPropertyOptional({ example: 'T-Shirts' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ example: 'IT-1002' })
  @IsString()
  @IsOptional()
  itemNumber?: string;

  @ApiPropertyOptional({ example: 'Red' })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({ example: 'Custom Embroidered T-Shirt' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 5.62 })
  @IsNumber()
  @IsOptional()
  baseCost?: number;

  @ApiPropertyOptional({
    description:
      'Dynamic dictionary/map of quantities for any size key selected by admin (e.g. { "sizeAdultS": 5, "sizeAdultM": 10, "sizeYouthL": 2, "sizeToddler2T": 1 })',
    example: { sizeAdultS: 5, sizeAdultM: 10, sizeYouthL: 2, sizeToddler2T: 1 },
  })
  @IsObject()
  @IsOptional()
  sizeBreakdown?: Record<string, number>;

  @ApiPropertyOptional({ example: 15 })
  @IsNumber()
  @IsOptional()
  markupPrice?: number;

  @ApiPropertyOptional({ example: 'matrix-uuid-123' })
  @IsString()
  @IsOptional()
  matrixId?: string;

  @ApiPropertyOptional({ example: 8.0 })
  @IsNumber()
  @IsOptional()
  printCost?: number;

  @ApiPropertyOptional({ example: 25 })
  @IsNumber()
  @IsOptional()
  unitPrice?: number;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isTaxed?: boolean;

  @ApiPropertyOptional({ example: 328.6 })
  @IsNumber()
  @IsOptional()
  total?: number;

  @ApiPropertyOptional({ example: 'Screen Print' })
  @IsString()
  @IsOptional()
  imprintType?: string;

  @ApiPropertyOptional({
    example: ['https://res.cloudinary.com/demo/image/upload/v1/mockup1.jpg'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  mockups?: string[];
}

export class QuoteGroupDto {
  @ApiProperty({ example: 'Group 1 - Staff Apparel' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ type: [CreateQuoteLineItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateQuoteLineItemDto)
  lineItems: CreateQuoteLineItemDto[];
}

export class CreateQuoteDto {
  @ApiProperty({ example: 'cust-uuid-123' })
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @ApiProperty({ example: 'rep-uuid-456' })
  @IsString()
  @IsNotEmpty()
  repId: string;

  @ApiPropertyOptional({ example: 'PO-998877' })
  @IsString()
  @IsOptional()
  poNumber?: string;

  @ApiPropertyOptional({ example: 'UPS Ground' })
  @IsString()
  @IsOptional()
  deliveryMethod?: string;

  @ApiPropertyOptional({ example: '2026-08-30T00:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({ enum: QuoteStatus, example: QuoteStatus.DRAFT })
  @IsEnum(QuoteStatus)
  @IsOptional()
  status?: QuoteStatus;

  @ApiPropertyOptional({ example: 5 })
  @IsNumber()
  @IsOptional()
  discount?: number;

  @ApiPropertyOptional({ example: 7 })
  @IsNumber()
  @IsOptional()
  taxRate?: number;

  @ApiPropertyOptional({ example: 950.0 })
  @IsNumber()
  @IsOptional()
  total?: number;

  @ApiPropertyOptional({ example: 'Please review and approve.' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ type: [QuoteGroupDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => QuoteGroupDto)
  groups?: QuoteGroupDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateQuoteLineItemDto)
  lineItems?: CreateQuoteLineItemDto[];
}

export class UpdateQuoteDto {
  @ApiPropertyOptional({ example: 'cust-uuid-123' })
  @IsString()
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({ example: 'rep-uuid-456' })
  @IsString()
  @IsOptional()
  repId?: string;

  @ApiPropertyOptional({ example: 'PO-998877' })
  @IsString()
  @IsOptional()
  poNumber?: string;

  @ApiPropertyOptional({ example: 'UPS Ground' })
  @IsString()
  @IsOptional()
  deliveryMethod?: string;

  @ApiPropertyOptional({ example: '2026-08-30T00:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({ enum: QuoteStatus })
  @IsEnum(QuoteStatus)
  @IsOptional()
  status?: QuoteStatus;

  @ApiPropertyOptional({ example: 5 })
  @IsNumber()
  @IsOptional()
  discount?: number;

  @ApiPropertyOptional({ example: 7 })
  @IsNumber()
  @IsOptional()
  taxRate?: number;

  @ApiPropertyOptional({ example: 950.0 })
  @IsNumber()
  @IsOptional()
  total?: number;

  @ApiPropertyOptional({ example: 'Updated terms.' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ type: [QuoteGroupDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => QuoteGroupDto)
  groups?: QuoteGroupDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateQuoteLineItemDto)
  lineItems?: CreateQuoteLineItemDto[];
}

export class CalculateQuoteDto {
  @ApiPropertyOptional({ example: 5 })
  @IsNumber()
  @IsOptional()
  discount?: number;

  @ApiPropertyOptional({ example: 7 })
  @IsNumber()
  @IsOptional()
  taxRate?: number;

  @ApiPropertyOptional({ example: 950.0 })
  @IsNumber()
  @IsOptional()
  total?: number;

  @ApiPropertyOptional({ type: [QuoteGroupDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => QuoteGroupDto)
  groups?: QuoteGroupDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateQuoteLineItemDto)
  lineItems?: CreateQuoteLineItemDto[];
}

export class PublicQuoteRevisionDto {
  @ApiPropertyOptional({
    example: 'Please change the T-Shirt color from Red to Blue.',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
