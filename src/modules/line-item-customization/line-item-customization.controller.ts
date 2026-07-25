import { Controller, Get, Patch, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LineItemCustomizationService } from './line-item-customization.service';
import { UpdateLineItemCustomizationDto } from './dto/line-item-customization.dto';

@ApiTags('Line Item Customization')
@ApiBearerAuth()
@Controller('line-item-customization')
export class LineItemCustomizationController {
  constructor(
    private readonly customizationService: LineItemCustomizationService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'Get line item customization settings (structured columns toggles and categorized sizing options)',
  })
  async getCustomization() {
    const data = await this.customizationService.getStructuredCustomization();
    return {
      message: 'Line item customization options fetched successfully',
      data,
    };
  }

  @Get('selected-sizes')
  @ApiOperation({
    summary:
      'Get array of currently selected/enabled size strings (e.g. ["S", "M", "L", "XL"])',
  })
  async getSelectedSizes() {
    const data = await this.customizationService.getSelectedSizesArray();
    return {
      message: 'Selected sizes fetched successfully',
      data,
    };
  }

  @Patch()
  @ApiOperation({
    summary:
      'Update default line item column toggles and selected sizing options',
  })
  async updateCustomization(@Body() dto: UpdateLineItemCustomizationDto) {
    await this.customizationService.updateCustomization(dto);
    const data = await this.customizationService.getStructuredCustomization();
    return {
      message: 'Line item customization updated successfully',
      data,
    };
  }
}
