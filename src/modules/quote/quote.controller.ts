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
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { QuoteService } from './quote.service';
import {
  CreateQuoteDto,
  UpdateQuoteDto,
  CalculateQuoteDto,
  QuoteStatus,
  PublicQuoteRevisionDto,
} from './dto/quote.dto';
import { GetQuotesDto } from './dto/get-quotes.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { Public } from 'src/common/decorators/public.decorator';

@ApiTags('Quote')
@ApiBearerAuth()
@Controller('quote')
export class QuoteController {
  constructor(
    private readonly quoteService: QuoteService,
    private readonly configService: ConfigService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post('upload-mockups')
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload up to 10 mockup/artwork files for quote line items',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  async uploadMockups(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }
    const urls = await this.cloudinaryService.uploadMultipleFiles(
      files,
      'quote-mockups',
    );
    return { urls };
  }

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

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC: Customer-facing quote view (no JWT required)
  // Frontend calls this with quoteId to display the full quote
  // ─────────────────────────────────────────────────────────────────────────

  @Public()
  @Get(':id/public')
  @ApiOperation({
    summary: 'Get a quote by ID (public, no auth)',
    description:
      'Customer-facing endpoint. Returns full quote data including line items, ' +
      'customer info, and rep info. No JWT required. ' +
      'The frontend calls this with the quoteId from the link sent via email/WhatsApp.',
  })
  findOnePublic(@Param('id') id: string) {
    return this.quoteService.findOnePublic(id);
  }

  @Public()
  @Post(':id/public/approve')
  @ApiOperation({
    summary: 'Approve a quote (public, customer action)',
    description:
      'Customer-facing approval endpoint. Sets status to APPROVED, creates active job and draft invoice.',
  })
  approvePublic(@Param('id') id: string) {
    return this.quoteService.updateStatusPublic(id, QuoteStatus.APPROVED);
  }

  @Public()
  @Post(':id/public/request-revision')
  @ApiOperation({
    summary: 'Request revision on a quote (public, customer action)',
    description:
      'Customer-facing request revision endpoint. Sets status to REVISION_REQUESTED and attaches customer notes.',
  })
  requestRevisionPublic(
    @Param('id') id: string,
    @Body() dto?: PublicQuoteRevisionDto,
  ) {
    return this.quoteService.updateStatusPublic(
      id,
      QuoteStatus.REVISION_REQUESTED,
      dto?.notes,
    );
  }

  @Public()
  @Post(':id/public/decline')
  @ApiOperation({
    summary: 'Decline a quote (public, customer action)',
    description: 'Customer-facing decline endpoint. Sets status to DECLINED.',
  })
  declinePublic(@Param('id') id: string) {
    return this.quoteService.updateStatusPublic(id, QuoteStatus.DECLINED);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DELIVERY: Send quote via Email
  // ─────────────────────────────────────────────────────────────────────────

  @Post(':id/send-email')
  @ApiOperation({
    summary: 'Send quote to customer via Email',
    description:
      'Sends a formatted HTML email to the customer with quote summary and a ' +
      'link to the frontend quote view page. Logs the delivery attempt to QuoteDeliveryLog.',
  })
  async sendViaEmail(@Param('id') id: string) {
    const frontendDomain =
      this.configService.get<string>('FRONTEND_DOMAIN') ?? '';
    return this.quoteService.sendViaEmail(id, frontendDomain);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DELIVERY: Send quote via WhatsApp
  // ─────────────────────────────────────────────────────────────────────────

  @Post(':id/send-whatsapp')
  @ApiOperation({
    summary: 'Send quote to customer via WhatsApp',
    description:
      "Sends a WhatsApp message to the customer's phone number with quote info and a link. " +
      'Tries free-text first (works within 24h window); automatically falls back to the ' +
      'approved `quote_delivery` template if the 24h window has expired. ' +
      'Logs the delivery attempt and method used to QuoteDeliveryLog.',
  })
  async sendViaWhatsApp(@Param('id') id: string) {
    const frontendDomain =
      this.configService.get<string>('FRONTEND_DOMAIN') ?? '';
    return this.quoteService.sendViaWhatsApp(id, frontendDomain);
  }
}
