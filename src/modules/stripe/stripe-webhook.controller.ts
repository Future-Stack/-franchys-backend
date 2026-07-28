import {
  Controller,
  Post,
  Req,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { StripeService } from './stripe.service';
import { CustomerInvoiceService } from '../invoice/customer-invoice.service';
import { Request } from 'express';
import Stripe from 'stripe';

@ApiTags('Stripe Webhook')
@Controller('stripe')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly customerInvoiceService: CustomerInvoiceService,
  ) {}

  /**
   * Stripe sends all payment events here.
   * IMPORTANT: This route must receive the RAW request body (Buffer), NOT parsed JSON.
   * The rawBody is needed to verify the Stripe webhook signature.
   * See main.ts — rawBody is preserved using express bodyParser with verify callback.
   */
  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Stripe webhook — receives payment events (invoice.payment_succeeded, etc.)',
    description:
      'Public endpoint called by Stripe. Signature is verified using STRIPE_WEBHOOK_SECRET. ' +
      'Processes invoice.payment_succeeded, invoice.payment_failed, invoice.marked_uncollectible.',
  })
  async handleWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string,
  ) {
    // rawBody is attached to the request by the bodyParser verify callback in main.ts
    const rawBody = (req as any).rawBody as Buffer;

    if (!rawBody) {
      throw new BadRequestException(
        'Raw body not available. Ensure rawBody middleware is configured in main.ts.',
      );
    }

    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    let event: Stripe.Event;
    try {
      event = this.stripeService.constructWebhookEvent(rawBody, signature);
    } catch (err: any) {
      this.logger.error(`Stripe webhook signature verification failed: ${err.message}`);
      throw new BadRequestException(`Webhook signature verification failed: ${err.message}`);
    }

    this.logger.log(`📨 Stripe event received: ${event.type} (${event.id})`);

    try {
      switch (event.type) {
        case 'invoice.payment_succeeded': {
          const stripeInvoice = event.data.object as Stripe.Invoice;
          await this.customerInvoiceService.handlePaymentSuccess(
            stripeInvoice.id,
            event.id,                                           // stripeEventId (idempotency key)
            stripeInvoice.amount_paid,                          // in cents
            (stripeInvoice as any).payment_intent ?? undefined, // pi_xxxx
            undefined,                                          // charge ID (from charge object)
            (stripeInvoice as any).payment_settings?.payment_method_types?.[0] ?? undefined,
          );
          break;
        }

        case 'invoice.payment_failed': {
          const stripeInvoice = event.data.object as Stripe.Invoice;
          this.logger.warn(
            `⚠️  Payment failed for Stripe invoice ${stripeInvoice.id}. Customer: ${stripeInvoice.customer}`,
          );
          // TODO: Optionally notify admin or update status to reflect failed attempt
          break;
        }

        case 'invoice.marked_uncollectible': {
          const stripeInvoice = event.data.object as Stripe.Invoice;
          this.logger.warn(
            `Invoice ${stripeInvoice.id} marked as uncollectible by Stripe.`,
          );
          // TODO: Update CustomerInvoice status to UNCOLLECTIBLE
          break;
        }

        default:
          this.logger.log(`Unhandled Stripe event type: ${event.type}`);
      }
    } catch (err: any) {
      this.logger.error(`Error processing Stripe event ${event.id}: ${err.message}`, err.stack);
      // Still return 200 to Stripe — if we return 4xx/5xx, Stripe will retry infinitely
    }

    // Always return 200 to Stripe so it stops retrying
    return { received: true };
  }
}
