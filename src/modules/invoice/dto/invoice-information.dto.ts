import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional } from 'class-validator';

export class UpdateInvoiceInformationDto {
  @ApiPropertyOptional({ description: 'Currency code', example: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ description: 'Language name', example: 'English' })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiPropertyOptional({
    description: 'Terms and conditions text',
    example: 'Payment is due within 30 days.',
  })
  @IsString()
  @IsOptional()
  termsAndCondition?: string;

  @ApiPropertyOptional({
    description: 'Payment terms and conditions text',
    example: 'Bank transfer details...',
  })
  @IsString()
  @IsOptional()
  paymentTramsAndCondition?: string;

  @ApiPropertyOptional({
    description: 'Invoice tax rate percentage',
    example: 15,
  })
  @IsInt()
  @IsOptional()
  invoiceTaxRate?: number;

  @ApiPropertyOptional({ description: 'Invoice seed number', example: 1001 })
  @IsInt()
  @IsOptional()
  invoiceSeed?: number;
}
