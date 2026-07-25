import { Module } from '@nestjs/common';
import { LineItemCustomizationService } from './line-item-customization.service';
import { LineItemCustomizationController } from './line-item-customization.controller';

@Module({
  controllers: [LineItemCustomizationController],
  providers: [LineItemCustomizationService],
  exports: [LineItemCustomizationService],
})
export class LineItemCustomizationModule {}
