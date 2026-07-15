import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JobService } from './job.service';
import { CreateJobDto, UpdateJobDto, UpdateJobStatusDto } from './dto/job.dto';
import { GetJobsDto } from './dto/get-jobs.dto';

@ApiTags('Job')
@ApiBearerAuth()
@Controller('job')
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new job card manually' })
  create(@Body() dto: CreateJobDto) {
    return this.jobService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all job cards' })
  findAll(@Query() query: GetJobsDto) {
    return this.jobService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get job card by ID' })
  findOne(@Param('id') id: string) {
    return this.jobService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update job card details' })
  update(@Param('id') id: string, @Body() dto: UpdateJobDto) {
    return this.jobService.update(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update job card workflow status' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateJobStatusDto) {
    return this.jobService.updateStatus(id, dto.status);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a job card' })
  remove(@Param('id') id: string) {
    return this.jobService.remove(id);
  }
}
