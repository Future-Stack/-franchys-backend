import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { GetVendorsQueryDto } from './dto/get-vendors-query.dto';
import { UpdateVendorStatusDto } from './dto/update-vendor-status.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('vendors')
@ApiBearerAuth()
@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) { }

  @Post()
  @ApiOperation({ summary: 'Create vendor' })
  create(@Body() createVendorDto: CreateVendorDto) {
    return this.vendorsService.create(createVendorDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all vendors with search and pagination' })
  findAll(@Query() query: GetVendorsQueryDto) {
    return this.vendorsService.findAll(query);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update vendor' })
  update(@Param('id') id: string, @Body() updateVendorDto: UpdateVendorDto) {
    return this.vendorsService.update(id, updateVendorDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete vendor' })
  remove(@Param('id') id: string) {
    return this.vendorsService.softDelete(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update vendor status' })
  updateStatus(@Param('id') id: string, @Body() updateVendorStatusDto: UpdateVendorStatusDto) {
    return this.vendorsService.updateStatus(id, updateVendorStatusDto);
  }
}
