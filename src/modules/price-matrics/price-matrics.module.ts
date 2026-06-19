import { Module } from '@nestjs/common';
import { PriceMatricsService } from './price-matrics.service';
import { PriceMatricsController } from './price-matrics.controller';

@Module({
  controllers: [PriceMatricsController],
  providers: [PriceMatricsService],
})
export class PriceMatricsModule { }
