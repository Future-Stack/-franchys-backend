import { Module } from '@nestjs/common';
import { ProfileShopService } from './profile-shop.service';
import { ProfileShopController } from './profile-shop.controller';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [CloudinaryModule],
  controllers: [ProfileShopController],
  providers: [ProfileShopService],
})
export class ProfileShopModule {}
