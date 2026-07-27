import { Module, Global } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { StripeWebhookController } from './stripe-webhook.controller';
import { InvoiceModule } from '../invoice/invoice.module';

@Global()
@Module({
  imports: [InvoiceModule],
  controllers: [StripeWebhookController],
  providers: [StripeService],
  exports: [StripeService],
})
export class StripeModule {}
