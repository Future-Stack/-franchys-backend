import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QuoteService } from './quote.service';
import { QuoteController } from './quote.controller';
import { JobModule } from '../job/job.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [ConfigModule, JobModule, WhatsAppModule],
  controllers: [QuoteController],
  providers: [QuoteService],
  exports: [QuoteService],
})
export class QuoteModule {}
