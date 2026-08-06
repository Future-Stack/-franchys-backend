import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import sanmarConfig from '../../config/sanmar.config';
import { SanMarSoapService } from './sanmar-soap.service';
import { SanMarService } from './sanmar.service';
import { SanMarController } from './sanmar.controller';

@Module({
  imports: [ConfigModule.forFeature(sanmarConfig)],
  controllers: [SanMarController],
  providers: [SanMarSoapService, SanMarService],
  exports: [SanMarService, SanMarSoapService],
})
export class SanMarModule {}
