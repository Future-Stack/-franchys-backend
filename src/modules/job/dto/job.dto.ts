import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
  IsArray,
} from 'class-validator';

export enum JobStatus {
  QUOTE = 'QUOTE',
  APPROVED = 'APPROVED',
  ART = 'ART',
  NEED_TO_ORDER = 'NEED_TO_ORDER',
  ORDER_ARRIVED = 'ORDER_ARRIVED',
  PRODUCTION = 'PRODUCTION',
  PAYMENT = 'PAYMENT',
  SHIP = 'SHIP',
  COMPLETED = 'COMPLETED',
}

export class CreateJobDto {
  @ApiProperty({ example: 'Q-1001' })
  @IsString()
  @IsNotEmpty()
  jobId: string;

  @ApiProperty({ example: 'Riverside Church' })
  @IsString()
  @IsNotEmpty()
  clientName: string;

  @ApiProperty({ example: 'Embroidered Polo Shirts (150 units)' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ enum: JobStatus, example: JobStatus.QUOTE })
  @IsEnum(JobStatus)
  @IsOptional()
  status?: JobStatus;

  @ApiProperty({ example: '2026-08-30T00:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  dueDate: string;

  @ApiProperty({ example: 1200.0 })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiPropertyOptional({ example: 'quote-uuid-123' })
  @IsString()
  @IsOptional()
  quoteId?: string;
}

export class UpdateJobDto {
  @ApiPropertyOptional({ example: 'Q-1001' })
  @IsString()
  @IsOptional()
  jobId?: string;

  @ApiPropertyOptional({ example: 'Riverside Church' })
  @IsString()
  @IsOptional()
  clientName?: string;

  @ApiPropertyOptional({ example: 'Embroidered Polo Shirts (150 units)' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: JobStatus })
  @IsEnum(JobStatus)
  @IsOptional()
  status?: JobStatus;

  @ApiPropertyOptional({ example: '2026-08-30T00:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({ example: 1200.0 })
  @IsNumber()
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({ example: 'quote-uuid-123' })
  @IsString()
  @IsOptional()
  quoteId?: string;
}

export class UpdateJobStatusDto {
  @ApiProperty({ enum: JobStatus, example: JobStatus.ART })
  @IsEnum(JobStatus)
  @IsNotEmpty()
  status: JobStatus;

  @ApiProperty({
    example: 'Art proof sent to client for approval.',
    description: 'Mandatory note explaining why the job status changed',
  })
  @IsString()
  @IsNotEmpty()
  note: string;
}

export class UpdateJobChecklistDto {
  @ApiPropertyOptional({
    description: 'Array of item IDs that have been marked as done',
    example: ['item-0-M', 'item-0-L'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  completedItemIds?: string[];

  @ApiPropertyOptional({
    description: 'Array of completed QC checklist keys',
    example: ['specifications', 'artwork_placement', 'color_matching'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  qcChecklist?: string[];
}
