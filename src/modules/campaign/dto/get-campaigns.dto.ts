import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum } from 'class-validator';
import { CampaignType, CampaignStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class GetCampaignsDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: CampaignType,
    description: 'Filter by campaign type',
  })
  @IsOptional()
  @IsEnum(CampaignType)
  type?: CampaignType;

  @ApiPropertyOptional({
    enum: CampaignStatus,
    description: 'Filter by campaign status',
  })
  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;
}
