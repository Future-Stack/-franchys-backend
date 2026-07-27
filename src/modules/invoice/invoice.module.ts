import { Module } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { InvoiceController } from './invoice.controller';
import { CustomerInvoiceService } from './customer-invoice.service';
import { CustomerInvoiceController } from './customer-invoice.controller';
import { PaymentTermService } from './payment-term.service';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [WhatsAppModule],
  controllers: [InvoiceController, CustomerInvoiceController],
  providers: [InvoiceService, CustomerInvoiceService, PaymentTermService],
  exports: [CustomerInvoiceService, PaymentTermService],
})
export class InvoiceModule {}
