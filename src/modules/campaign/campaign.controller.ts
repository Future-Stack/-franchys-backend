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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CampaignService } from './campaign.service';
import { CreateCampaignDto, UpdateCampaignDto } from './dto/campaign.dto';
import { ValidateDiscountDto } from './dto/validate-discount.dto';
import { GetCampaignsDto } from './dto/get-campaigns.dto';

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
  findAll(@Query() query: GetCampaignsDto) {
    return this.campaignService.findAll(query);
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
