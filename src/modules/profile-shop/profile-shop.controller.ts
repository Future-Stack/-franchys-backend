import {
  Controller,
  Get,
  Patch,
  Body,
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
import { ProfileShopService } from './profile-shop.service';
import { UpdateShopDto } from './dto/update-shop.dto';
import { createMulterOptions } from '../../common/utils/file-upload.util';

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
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('companyLogo', createMulterOptions(20)))
  updateActiveShop(
    @Body() updateShopDto: UpdateShopDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.profileShopService.updateActiveShop(updateShopDto, file);
  }
}
