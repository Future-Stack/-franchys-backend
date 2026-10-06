import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum } from 'class-validator';
import { CustomerType } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { Transform } from 'class-transformer';

export enum CustomerSortBy {
  ORDERS = 'orders',
  TOTAL_SPENT = 'totalSpent',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class GetCustomersDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: CustomerType,
    description: 'Filter by customer type',
  })
  @IsOptional()
  @IsEnum(CustomerType)
  customerType?: CustomerType;

  @ApiPropertyOptional({
    enum: CustomerSortBy,
    description: 'Field to sort by: "orders" or "totalSpent"',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const v = value.trim().toLowerCase();
      if (v === 'orders' || v === 'order') return CustomerSortBy.ORDERS;
      if (v === 'totalspent' || v === 'total_spent')
        return CustomerSortBy.TOTAL_SPENT;
    }
    return value;
  })
  @IsEnum(CustomerSortBy)
  sortBy?: CustomerSortBy;

  @ApiPropertyOptional({
    enum: SortOrder,
    description:
      'Sort order: "asc" (count down to up) or "desc" (count up to down)',
    default: SortOrder.DESC,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const v = value.trim().toLowerCase();
      if (v === 'asc' || v === 'up' || v === 'down_to_up') return SortOrder.ASC;
      if (v === 'desc' || v === 'down' || v === 'up_to_down')
        return SortOrder.DESC;
    }
    return value;
  })
  @IsEnum(SortOrder)
  sortOrder?: SortOrder;
}
