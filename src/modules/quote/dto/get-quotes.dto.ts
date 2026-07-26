import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum } from 'class-validator';
import { QuoteStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class GetQuotesDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: QuoteStatus,
    description: 'Filter by quote status',
  })
  @IsOptional()
  @IsEnum(QuoteStatus)
  status?: QuoteStatus;
}
