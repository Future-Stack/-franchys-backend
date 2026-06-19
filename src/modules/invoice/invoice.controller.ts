import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InvoiceService } from './invoice.service';
import { CreateInvoiceFeeDto, UpdateInvoiceFeeDto } from './dto/invoice-fees.dto';
import { UpdateInvoiceInformationDto } from './dto/invoice-information.dto';

@ApiTags('Invoice')
@ApiBearerAuth()
@Controller('invoice')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

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
  updateInformation(@Body() updateInvoiceInformationDto: UpdateInvoiceInformationDto) {
    return this.invoiceService.updateInformation(updateInvoiceInformationDto);
  }
}

