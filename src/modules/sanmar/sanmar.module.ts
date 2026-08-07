import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import sanmarConfig from '../../config/sanmar.config';
import { SanMarSoapService } from './sanmar-soap.service';
import { SanMarSftpService } from './sanmar-sftp.service';
import { SanMarService } from './sanmar.service';
import { SanMarController } from './sanmar.controller';

@Module({
  imports: [ConfigModule.forFeature(sanmarConfig)],
  controllers: [SanMarController],
  providers: [SanMarSoapService, SanMarSftpService, SanMarService],
  exports: [SanMarService, SanMarSoapService, SanMarSftpService],
})
export class SanMarModule {}
