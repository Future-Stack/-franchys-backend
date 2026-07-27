import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class CreatePaymentTermDto {
  @ApiProperty({ description: 'Name of the payment term', example: 'Net 30' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Number of days until payment is due',
    example: 30,
  })
  @IsInt()
  @Min(1)
  paymentDaysAllowed: number;

  @ApiPropertyOptional({
    description:
      'Percentage required as deposit upfront (null = full payment). If set, system creates 2 installments.',
    example: 50,
  })
  @IsNumber()
  @Min(1)
  @Max(99)
  @IsOptional()
  depositPercent?: number;

  @ApiPropertyOptional({
    description:
      'How to calculate due date for installment #2+. FROM_INVOICE_DATE (always X days from send) or FROM_PREVIOUS_PAID (X days after previous installment paid)',
    example: 'FROM_INVOICE_DATE',
    enum: ['FROM_INVOICE_DATE', 'FROM_PREVIOUS_PAID'],
  })
  @IsString()
  @IsOptional()
  dueDateStrategy?: string;
}

export class UpdatePaymentTermDto {
  @ApiPropertyOptional({ example: 'Net 30' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 30 })
  @IsInt()
  @Min(1)
  @IsOptional()
  paymentDaysAllowed?: number;

  @ApiPropertyOptional({ example: 50 })
  @IsNumber()
  @Min(1)
  @Max(99)
  @IsOptional()
  depositPercent?: number;

  @ApiPropertyOptional({
    enum: ['FROM_INVOICE_DATE', 'FROM_PREVIOUS_PAID'],
  })
  @IsString()
  @IsOptional()
  dueDateStrategy?: string;

  @ApiPropertyOptional({ description: 'Archive this payment term (hide from list)' })
  @IsBoolean()
  @IsOptional()
  isArchived?: boolean;
}
