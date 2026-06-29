import { Module } from '@nestjs/common';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppHttpClient } from './whatsapp.http';

@Module({
  controllers: [WhatsAppController],
  providers: [WhatsAppService, WhatsAppHttpClient],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
