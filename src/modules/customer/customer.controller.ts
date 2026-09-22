import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { CustomerService } from './customer.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { GetCustomersDto } from './dto/get-customers.dto';
import { createMulterOptions } from '../../common/utils/file-upload.util';

@ApiTags('Customer')
@ApiBearerAuth()
@Controller('customer')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new customer' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('profileImage', createMulterOptions(20)))
  create(
    @Body() dto: CreateCustomerDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.customerService.create(dto, file);
  }

  @Get()
  @ApiOperation({ summary: 'Get all customers' })
  findAll(@Query() query: GetCustomersDto) {
    return this.customerService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a customer by ID' })
  findOne(@Param('id') id: string) {
    return this.customerService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a customer by ID' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('profileImage', createMulterOptions(20)))
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.customerService.update(id, dto, file);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a customer by ID' })
  remove(@Param('id') id: string) {
    return this.customerService.remove(id);
  }
}
