import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { WhatsAppService } from './whatsapp.service';
import {
  ReplyDto,
  SendMessageDto,
  SendTemplateMessageDto,
} from './dto/whatsapp.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('WhatsApp Tracker')
@Controller('whatsapp')
@ApiBearerAuth()
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);

  constructor(
    private readonly whatsAppService: WhatsAppService,
    private readonly configService: ConfigService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // WEBHOOK: Step 1 — Meta verifies your endpoint on first setup (GET)
  // Meta sends: ?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=CHALLENGE
  // You must respond with the challenge string to prove ownership.
  // ─────────────────────────────────────────────────────────────────────────────

  @Public()
  @Get('webhook')
  @ApiOperation({
    summary: 'WhatsApp Webhook Verification (Meta GET challenge)',
    description:
      'Meta calls this once when you set up your webhook in the Developer Console. ' +
      'It verifies you own the endpoint by checking the verify_token and returning the challenge. ' +
      'No auth required — this must be publicly accessible.',
  })
  @ApiResponse({
    status: 200,
    description: 'Challenge returned. Webhook verified.',
  })
  @ApiResponse({
    status: 403,
    description: 'Token mismatch. Verification failed.',
  })
  verifyWebhook(@Query() query: Record<string, string>, @Res() res: any) {
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    // Read verify token from config (never from process.env directly)
    const expectedToken = this.configService.get<string>(
      'whatsapp.verifyToken',
    );

    if (mode === 'subscribe' && token === expectedToken) {
      this.logger.log('WhatsApp webhook verified successfully.');
      return res.status(HttpStatus.OK).send(challenge);
    }

    this.logger.warn(`Webhook verification failed. Received token: ${token}`);
    return res.status(HttpStatus.FORBIDDEN).send('Forbidden');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // WEBHOOK: Step 2 — Meta pushes real events here (POST)
  // This receives incoming customer messages, delivery status updates, etc.
  // Must respond with 200 immediately (< 20 seconds), process asynchronously.
  // ─────────────────────────────────────────────────────────────────────────────

  @Public()
  @Post('webhook')
  @ApiOperation({
    summary: 'WhatsApp Webhook — receive incoming messages from Meta',
    description:
      'Meta pushes all WhatsApp events here (incoming messages, status updates). ' +
      'The controller immediately acknowledges with 200 OK, then processes asynchronously. ' +
      'No auth required — this must be publicly accessible.',
  })
  @ApiResponse({ status: 200, description: 'Webhook acknowledged.' })
  async handleWebhook(@Body() body: any, @Res() res: any) {
    // IMPORTANT: Must respond with 200 immediately.
    // If Meta doesn't get 200 within 20s, it will retry the webhook.
    res.status(HttpStatus.OK).send('EVENT_RECEIVED');

    try {
      this.logger.log(`Received Webhook Payload: ${JSON.stringify(body)}`);
      await this.whatsAppService.handleIncomingMessage(body);
    } catch (err) {
      this.logger.error('WhatsApp webhook processing error', err);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CONVERSATIONS: List, read messages, reply (auth-protected)
  // Equivalent to email /emails/threads endpoints
  // ─────────────────────────────────────────────────────────────────────────────

  @Get('conversations')
  @ApiOperation({
    summary: 'Get all WhatsApp conversations',
    description:
      'Returns all conversations ordered by latest activity with contact info and last message preview.',
  })
  @ApiResponse({ status: 200, description: 'Conversations list returned.' })
  getConversations() {
    return this.whatsAppService.getConversations();
  }

  @Get('conversations/:id/messages')
  @ApiOperation({
    summary: 'Get all messages in a conversation',
    description:
      'Returns all messages for the given conversation ID, ordered chronologically.',
  })
  @ApiParam({ name: 'id', description: 'Conversation UUID' })
  @ApiResponse({ status: 200, description: 'Messages list returned.' })
  getConversationMessages(@Param('id') id: string) {
    return this.whatsAppService.getConversationMessages(id);
  }

  @Post('conversations/:id/reply')
  @ApiOperation({
    summary: 'Reply to a WhatsApp conversation',
    description:
      'Sends a free-form text reply. Only works within 24 hours of the last customer message. ' +
      'After 24h, use the /send-template endpoint instead.',
  })
  @ApiParam({ name: 'id', description: 'Conversation UUID' })
  @ApiBody({ type: ReplyDto })
  @ApiResponse({ status: 201, description: 'Reply sent successfully.' })
  async replyToConversation(@Param('id') id: string, @Body() dto: ReplyDto) {
    return this.whatsAppService.sendReply(id, dto.text);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CONTACTS: List all WhatsApp contacts
  // ─────────────────────────────────────────────────────────────────────────────

  @Get('contacts')
  @ApiOperation({
    summary: 'Get all WhatsApp contacts',
    description:
      'Returns all WhatsApp contacts with their latest conversation.',
  })
  @ApiResponse({ status: 200, description: 'Contacts list returned.' })
  getContacts() {
    return this.whatsAppService.getContacts();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TEMPLATE MESSAGE: Send an approved template to any phone number
  // Use this to initiate contact OR after the 24-hour window has expired
  // ─────────────────────────────────────────────────────────────────────────────

  @Post('send-template')
  @ApiOperation({
    summary: 'Send a WhatsApp Template Message',
    description:
      'Sends a Meta pre-approved message template. ' +
      'REQUIRED for first-contact or re-contacting after the 24-hour customer service window. ' +
      'Templates must be created and approved in Meta Business Suite before use.',
  })
  @ApiBody({ type: SendTemplateMessageDto })
  @ApiResponse({ status: 201, description: 'Template message sent.' })
  async sendTemplateMessage(@Body() dto: SendTemplateMessageDto) {
    return this.whatsAppService.sendTemplateMessage(
      dto.to,
      dto.templateName,
      dto.languageCode,
    );
  }
}
