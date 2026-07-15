import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum } from 'class-validator';
import { CustomerType } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class GetCustomersDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: CustomerType,
    description: 'Filter by customer type',
  })
  @IsOptional()
  @IsEnum(CustomerType)
  customerType?: CustomerType;
}
