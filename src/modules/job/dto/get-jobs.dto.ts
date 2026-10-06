import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString } from 'class-validator';
import { JobStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export enum JobSortBy {
  DATE = 'date',
  DUE_DATE = 'dueDate',
  AMOUNT = 'amount',
  CREATED_AT = 'createdAt',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class GetJobsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: JobStatus, description: 'Filter by job status' })
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @ApiPropertyOptional({
    description: 'Filter by date (YYYY-MM-DD) or sort order ("asc" | "desc")',
    example: '2026-08-30',
  })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional({
    description: 'Filter by amount value or sort order ("asc" | "desc")',
    example: '1200',
  })
  @IsOptional()
  @IsString()
  amount?: string;

  @ApiPropertyOptional({
    enum: JobSortBy,
    description: 'Field to sort by: "date", "dueDate", "amount", "createdAt"',
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    enum: SortOrder,
    description: 'Sort direction: "asc" or "desc"',
    default: SortOrder.DESC,
  })
  @IsOptional()
  @IsString()
  sortOrder?: string;
}
