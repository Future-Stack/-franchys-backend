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
import { PriceMatricsService } from './price-matrics.service';
import {
  CreatePriceMatrixDto,
  UpdatePriceMatrixDto,
  CreatePriceTierDto,
} from './dto/price-matrix.dto';

@ApiTags('Price Matrices')
@ApiBearerAuth()
@Controller('price-matrics')
export class PriceMatricsController {
  constructor(private readonly priceMatricsService: PriceMatricsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new price matrix with optional tiers' })
  create(@Body() createPriceMatrixDto: CreatePriceMatrixDto) {
    return this.priceMatricsService.create(createPriceMatrixDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all price matrices along with their tiers' })
  findAll() {
    return this.priceMatricsService.findAll();
  }

  @Get(':priceMatrixId')
  @ApiOperation({ summary: 'Get a specific price matrix by ID' })
  findOne(@Param('priceMatrixId') priceMatrixId: string) {
    return this.priceMatricsService.findOne(priceMatrixId);
  }

  @Patch(':priceMatrixId')
  @ApiOperation({ summary: 'Update price matrix (name and priceType only)' })
  update(
    @Param('priceMatrixId') priceMatrixId: string,
    @Body() updatePriceMatrixDto: UpdatePriceMatrixDto,
  ) {
    return this.priceMatricsService.update(priceMatrixId, updatePriceMatrixDto);
  }

  @Delete(':priceMatrixId')
  @ApiOperation({
    summary: 'Delete a price matrix and all its associated tiers',
  })
  remove(@Param('priceMatrixId') priceMatrixId: string) {
    return this.priceMatricsService.remove(priceMatrixId);
  }

  @Post(':priceMatrixId/tiers')
  @ApiOperation({ summary: 'Add a new price tier directly to a price matrix' })
  addTier(
    @Param('priceMatrixId') priceMatrixId: string,
    @Body() createPriceTierDto: CreatePriceTierDto,
  ) {
    return this.priceMatricsService.addTier(priceMatrixId, createPriceTierDto);
  }

  @Patch(':priceMatrixId/tiers/:priceTierId')
  @ApiOperation({ summary: 'Update an individual price tier directly' })
  updateTier(
    @Param('priceMatrixId') priceMatrixId: string,
    @Param('priceTierId') priceTierId: string,
    @Body() updatePriceTierDto: CreatePriceTierDto,
  ) {
    return this.priceMatricsService.updateTier(priceTierId, updatePriceTierDto);
  }

  @Delete(':priceMatrixId/tiers/:priceTierId')
  @ApiOperation({ summary: 'Delete a single price tier directly' })
  removeTier(
    @Param('priceMatrixId') priceMatrixId: string,
    @Param('priceTierId') priceTierId: string,
  ) {
    return this.priceMatricsService.removeTier(priceTierId);
  }
}
