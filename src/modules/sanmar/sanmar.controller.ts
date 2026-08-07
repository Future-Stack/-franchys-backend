import {
  Controller,
  Get,
  Post,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { SanMarService } from './sanmar.service';
import { SanMarProductSearchDto, SanMarAutocompleteDto } from './dto/sanmar.dto';

@ApiTags('SanMar')
@ApiBearerAuth()
@Controller('sanmar')
export class SanMarController {
  constructor(private readonly sanMarService: SanMarService) {}

  @Public()
  @Get('products/autocomplete')
  @ApiOperation({
    summary:
      'SanMar product autocomplete — matches style#, name, brand, color. Same response format as /product/autocomplete.',
  })
  @ApiQuery({ name: 'search', required: false, description: 'Style / product search term (e.g. 8000, PC61)' })
  async autocomplete(@Query() dto: SanMarAutocompleteDto) {
    const data = await this.sanMarService.autocomplete(dto);
    return {
      message: 'Product autocomplete options fetched successfully',
      data,
    };
  }

  @Public()
  @Post('sync-sftp')
  @ApiOperation({
    summary: 'Download & Sync SanMar product catalog CSV (SanMar_EPDD.csv) from ftp.sanmar.com:2200.',
  })
  async syncSftp() {
    const result = await this.sanMarService.syncSftpCatalog();
    return {
      message: result.message,
      data: result,
    };
  }

  @Public()
  @Get('products/raw/:styleNo')
  @ApiOperation({
    summary: 'Get raw unparsed SOAP response and SFTP match from SanMar for debugging.',
  })
  @ApiParam({
    name: 'styleNo',
    description: 'SanMar style number (e.g. 8000, PC61)',
    example: '8000',
  })
  async getRawProduct(@Param('styleNo') styleNo: string) {
    const data = await this.sanMarService.getRawProduct(styleNo.toUpperCase());
    return {
      message: 'Raw SanMar response fetched successfully',
      data,
    };
  }

  @Get('products')
  @ApiOperation({
    summary: 'Search SanMar products — formatted same as /product autocomplete/list.',
  })
  async searchProducts(@Query() dto: SanMarProductSearchDto) {
    const result = await this.sanMarService.searchProducts(dto);
    return {
      message: 'Products fetched successfully',
      ...result,
    };
  }

  @Get('products/:styleNo')
  @ApiOperation({
    summary: 'Get details for a SanMar product by style number.',
  })
  @ApiParam({
    name: 'styleNo',
    description: 'SanMar style number (e.g. 8000, PC61)',
    example: '8000',
  })
  async getProduct(@Param('styleNo') styleNo: string) {
    const data = await this.sanMarService.getProduct(styleNo.toUpperCase());
    return {
      message: 'Product fetched successfully',
      data,
    };
  }

  @Get('inventory/:styleNo')
  @ApiOperation({
    summary: 'Get real-time warehouse inventory for a SanMar style.',
  })
  @ApiParam({
    name: 'styleNo',
    description: 'SanMar style number',
    example: '8000',
  })
  @ApiQuery({ name: 'color', required: false, description: 'Color name to filter' })
  @ApiQuery({ name: 'size', required: false, description: 'Size label to filter' })
  async getInventory(
    @Param('styleNo') styleNo: string,
    @Query('color') color?: string,
    @Query('size') size?: string,
  ) {
    const data = await this.sanMarService.getInventory(
      styleNo.toUpperCase(),
      color,
      size,
    );
    return {
      message: 'Inventory fetched successfully',
      data,
    };
  }
}
