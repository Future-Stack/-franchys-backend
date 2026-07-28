import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { InvoiceService } from './invoice.service';
import {
  CreateInvoiceFeeDto,
  UpdateInvoiceFeeDto,
} from './dto/invoice-fees.dto';
import { UpdateInvoiceInformationDto } from './dto/invoice-information.dto';
import { PaymentTermService } from './payment-term.service';
import {
  CreatePaymentTermDto,
  UpdatePaymentTermDto,
} from './dto/payment-term.dto';

@ApiTags('Invoice')
@ApiBearerAuth()
@Controller('invoice')
export class InvoiceController {
  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly paymentTermService: PaymentTermService,
  ) {}

  // --- Invoice Fees CRUD Endpoints ---

  @Post('fees')
  @ApiOperation({ summary: 'Create a new invoice fee' })
  createFee(@Body() createInvoiceFeeDto: CreateInvoiceFeeDto) {
    return this.invoiceService.createFee(createInvoiceFeeDto);
  }

  @Get('fees')
  @ApiOperation({ summary: 'Get all invoice fees' })
  findAllFees() {
    return this.invoiceService.findAllFees();
  }

  @Get('fees/:infId')
  @ApiOperation({ summary: 'Get a specific invoice fee by ID' })
  findOneFee(@Param('infId') infId: string) {
    return this.invoiceService.findOneFee(infId);
  }

  @Patch('fees/:infId')
  @ApiOperation({ summary: 'Update a specific invoice fee' })
  updateFee(
    @Param('infId') infId: string,
    @Body() updateInvoiceFeeDto: UpdateInvoiceFeeDto,
  ) {
    return this.invoiceService.updateFee(infId, updateInvoiceFeeDto);
  }

  @Delete('fees/:infId')
  @ApiOperation({ summary: 'Delete a specific invoice fee' })
  removeFee(@Param('infId') infId: string) {
    return this.invoiceService.removeFee(infId);
  }

  // --- Invoice Information Endpoints ---

  @Get('information')
  @ApiOperation({ summary: 'Get active invoice information' })
  getInformation() {
    return this.invoiceService.getInformation();
  }

  @Patch('information')
  @ApiOperation({ summary: 'Update active invoice information' })
  updateInformation(
    @Body() updateInvoiceInformationDto: UpdateInvoiceInformationDto,
  ) {
    return this.invoiceService.updateInformation(updateInvoiceInformationDto);
  }

  // --- Payment Terms Endpoints ---

  @Post('payment-terms')
  @ApiOperation({
    summary: 'Create a new payment term (e.g. Net 30, 50% Deposit)',
  })
  createPaymentTerm(@Body() dto: CreatePaymentTermDto) {
    return this.paymentTermService.create(dto);
  }

  @Get('payment-terms')
  @ApiOperation({ summary: 'Get all active payment terms' })
  findAllPaymentTerms() {
    return this.paymentTermService.findAll();
  }

  @Get('payment-terms/:id')
  @ApiOperation({ summary: 'Get a specific payment term' })
  @ApiParam({ name: 'id', description: 'Payment term UUID' })
  findOnePaymentTerm(@Param('id') id: string) {
    return this.paymentTermService.findOne(id);
  }

  @Patch('payment-terms/:id')
  @ApiOperation({ summary: 'Update a payment term' })
  @ApiParam({ name: 'id', description: 'Payment term UUID' })
  updatePaymentTerm(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentTermDto,
  ) {
    return this.paymentTermService.update(id, dto);
  }

  @Delete('payment-terms/:id')
  @ApiOperation({ summary: 'Archive (soft-delete) a payment term' })
  @ApiParam({ name: 'id', description: 'Payment term UUID' })
  archivePaymentTerm(@Param('id') id: string) {
    return this.paymentTermService.archive(id);
  }
}
