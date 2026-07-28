import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({
    summary: 'Get summary metrics and trend data for the main Dashboard page',
  })
  getDashboardStats() {
    return this.analyticsService.getDashboardStats();
  }

  @Get('reports')
  @ApiOperation({
    summary:
      'Get comprehensive performance metrics, quote status breakdown, and product performance for the Reports & Analytics page',
  })
  getReportsAnalytics() {
    return this.analyticsService.getReportsAnalytics();
  }
}
