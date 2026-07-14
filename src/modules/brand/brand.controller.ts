import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BrandService } from './brand.service';
import { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto';

@ApiTags('Brand')
@ApiBearerAuth()
@Controller('brand')
export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new brand' })
  async create(@Body() dto: CreateBrandDto) {
    const data = await this.brandService.create(dto);
    return {
      message: 'Brand created successfully',
      data,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all brands' })
  async findAll() {
    const data = await this.brandService.findAll();
    return {
      message: 'Brands fetched successfully',
      data,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a brand by ID' })
  async findOne(@Param('id') id: string) {
    const data = await this.brandService.findOne(id);
    return {
      message: 'Brand fetched successfully',
      data,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a brand by ID' })
  async update(@Param('id') id: string, @Body() dto: UpdateBrandDto) {
    const data = await this.brandService.update(id, dto);
    return {
      message: 'Brand updated successfully',
      data,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a brand by ID' })
  async remove(@Param('id') id: string) {
    const data = await this.brandService.remove(id);
    return {
      message: 'Brand deleted successfully',
      data,
    };
  }
}
