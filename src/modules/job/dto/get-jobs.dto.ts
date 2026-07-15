import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum } from 'class-validator';
import { JobStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class GetJobsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: JobStatus, description: 'Filter by job status' })
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;
}
