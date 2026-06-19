import { Controller, Get, Patch, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProfileShopService } from './profile-shop.service';
import { UpdateShopDto } from './dto/update-shop.dto';

@ApiTags('Profile Shop')
@ApiBearerAuth()
@Controller('profile-shop')
export class ProfileShopController {
  constructor(private readonly profileShopService: ProfileShopService) {}

  @Get()
  @ApiOperation({ summary: 'Get active shop information' })
  getActiveShop() {
    return this.profileShopService.getActiveShop();
  }

  @Patch()
  @ApiOperation({ summary: 'Update active shop information' })
  updateActiveShop(@Body() updateShopDto: UpdateShopDto) {
    return this.profileShopService.updateActiveShop(updateShopDto);
  }
}
