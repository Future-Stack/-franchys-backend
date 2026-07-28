import { Module } from '@nestjs/common';
import { QuoteService } from './quote.service';
import { QuoteController } from './quote.controller';
import { JobModule } from '../job/job.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { MailModule } from '../mail/mail.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { InvoiceModule } from '../invoice/invoice.module';

@Module({
  imports: [
    JobModule,
    CloudinaryModule,
    MailModule,
    WhatsAppModule,
    InvoiceModule,
  ],
  controllers: [QuoteController],
  providers: [QuoteService],
  exports: [QuoteService],
})
export class QuoteModule {}
