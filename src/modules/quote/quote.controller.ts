import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { QuoteService } from './quote.service';
import {
  CreateQuoteDto,
  UpdateQuoteDto,
  CalculateQuoteDto,
} from './dto/quote.dto';
import { GetQuotesDto } from './dto/get-quotes.dto';

@ApiTags('Quote')
@ApiBearerAuth()
@Controller('quote')
export class QuoteController {
  constructor(private readonly quoteService: QuoteService) {}

  @Post('refresh-pricing/new')
  @ApiOperation({
    summary:
      'Triggered by "Refresh Pricing" button for NEW unsaved quotes (preview calculation)',
  })
  refreshPricingNew(@Body() dto: CalculateQuoteDto) {
    return this.quoteService.calculatePreview(dto);
  }

  @Post(':id/refresh-pricing/existing')
  @ApiOperation({
    summary:
      'Triggered by "Refresh Pricing" button for EXISTING saved quotes (recalculates and updates DB)',
  })
  refreshPricingExisting(
    @Param('id') id: string,
    @Body() dto?: UpdateQuoteDto,
  ) {
    return this.quoteService.refreshPricingExisting(id, dto);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new quote' })
  create(@Body() dto: CreateQuoteDto) {
    return this.quoteService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all quotes' })
  findAll(@Query() query: GetQuotesDto) {
    return this.quoteService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a quote by ID' })
  findOne(@Param('id') id: string) {
    return this.quoteService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a quote by ID' })
  update(@Param('id') id: string, @Body() dto: UpdateQuoteDto) {
    return this.quoteService.update(id, dto);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a quote' })
  approve(
    @Param('id') id: string,
    @Req() req: { user: { userId: string; email: string; role: string } },
  ) {
    const user = req.user;
    return this.quoteService.updateStatusWithPermissionCheck(
      id,
      'APPROVED',
      user,
    );
  }

  @Post(':id/request-revision')
  @ApiOperation({ summary: 'Request revision on a quote' })
  requestRevision(
    @Param('id') id: string,
    @Req() req: { user: { userId: string; email: string; role: string } },
  ) {
    const user = req.user;
    return this.quoteService.updateStatusWithPermissionCheck(
      id,
      'REVISION_REQUESTED',
      user,
    );
  }

  @Post(':id/decline')
  @ApiOperation({ summary: 'Decline a quote' })
  decline(
    @Param('id') id: string,
    @Req() req: { user: { userId: string; email: string; role: string } },
  ) {
    const user = req.user;
    return this.quoteService.updateStatusWithPermissionCheck(
      id,
      'DECLINED',
      user,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a quote by ID' })
  remove(@Param('id') id: string) {
    return this.quoteService.remove(id);
  }
}
