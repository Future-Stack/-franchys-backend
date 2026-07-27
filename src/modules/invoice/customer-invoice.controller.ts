import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CustomerInvoiceService } from './customer-invoice.service';
import {
  CreateCustomerInvoiceDto,
  UpdateCustomerInvoiceDto,
  SendInvoiceDto,
  GetInvoicesDto,
} from './dto/customer-invoice.dto';

@ApiTags('Customer Invoices')
@ApiBearerAuth()
@Controller('invoices')
export class CustomerInvoiceController {
  constructor(private readonly invoiceService: CustomerInvoiceService) {}

  @Post()
  @ApiOperation({ summary: 'Create an invoice manually (admin)' })
  create(@Body() dto: CreateCustomerInvoiceDto) {
    return this.invoiceService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List all invoices (with optional filters: customerId, quoteId, status)',
  })
  findAll(@Query() query: GetInvoicesDto) {
    return this.invoiceService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get full invoice details by ID' })
  @ApiParam({ name: 'id', description: 'Invoice UUID' })
  findOne(@Param('id') id: string) {
    return this.invoiceService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a DRAFT invoice (line items, payment term, due date, notes)',
  })
  @ApiParam({ name: 'id', description: 'Invoice UUID' })
  update(@Param('id') id: string, @Body() dto: UpdateCustomerInvoiceDto) {
    return this.invoiceService.update(id, dto);
  }

  @Post(':id/send')
  @ApiOperation({
    summary:
      'Send invoice to customer — creates Stripe invoice, gets hosted_invoice_url, sends via Email + WhatsApp',
  })
  @ApiParam({ name: 'id', description: 'Invoice UUID' })
  send(@Param('id') id: string, @Body() dto: SendInvoiceDto) {
    return this.invoiceService.sendInvoice(id, dto);
  }

  @Post(':id/send-reminder')
  @ApiOperation({
    summary:
      'Resend existing payment link to customer (link never expires — no new Stripe invoice created)',
  })
  @ApiParam({ name: 'id', description: 'Invoice UUID' })
  sendReminder(@Param('id') id: string) {
    return this.invoiceService.sendReminder(id);
  }

  @Post(':id/void')
  @ApiOperation({ summary: 'Cancel/void an invoice (cannot void a paid invoice)' })
  @ApiParam({ name: 'id', description: 'Invoice UUID' })
  void(@Param('id') id: string) {
    return this.invoiceService.voidInvoice(id);
  }
}
