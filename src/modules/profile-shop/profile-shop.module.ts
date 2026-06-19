import { Module } from '@nestjs/common';
import { ProfileShopService } from './profile-shop.service';
import { ProfileShopController } from './profile-shop.controller';

@Module({
  controllers: [ProfileShopController],
  providers: [ProfileShopService],
})
export class ProfileShopModule {}
