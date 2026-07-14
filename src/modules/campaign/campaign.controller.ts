import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CampaignService } from './campaign.service';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/campaign.dto';
import { ValidateDiscountDto } from './dto/validate-discount.dto';

@ApiTags('Campaign')
@ApiBearerAuth()
@Controller('campaign')
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new campaign draft' })
  create(@Body() dto: CreateCampaignDto) {
    return this.campaignService.create(dto);
  }

  @Post('validate-code')
  @ApiOperation({ summary: 'Validate a promotional discount code' })
  validateDiscountCode(@Body() dto: ValidateDiscountDto) {
    return this.campaignService.validateDiscountCode(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all campaigns' })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  findAll(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.campaignService.findAll(type, status, search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get campaign details by ID' })
  findOne(@Param('id') id: string) {
    return this.campaignService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update campaign details' })
  update(@Param('id') id: string, @Body() dto: UpdateCampaignDto) {
    return this.campaignService.update(id, dto);
  }

  @Post(':id/send')
  @ApiOperation({ summary: 'Trigger sending campaign' })
  send(@Param('id') id: string) {
    return this.campaignService.send(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a campaign card' })
  remove(@Param('id') id: string) {
    return this.campaignService.remove(id);
  }
}
