import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class ValidateDiscountDto {
  @ApiProperty({ example: 'SPRING26' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 250.0 })
  @IsNumber()
  @IsNotEmpty()
  orderAmount: number;

  @ApiPropertyOptional({ example: 'cust-uuid-123' })
  @IsString()
  @IsOptional()
  customerId?: string;
}
