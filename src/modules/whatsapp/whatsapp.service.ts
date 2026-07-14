import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsAppHttpClient } from './whatsapp.http';

/**
 * WhatsAppService — core business logic for WhatsApp automation.
 * Mirrors the pattern of EmailTrackerService:
 *   - handleIncomingMessage()  ↔  handleWebhook() + syncEmails()
 *   - sendReply()              ↔  sendFollowUpEmail()
 *   - getConversations()       ↔  getThreads()
 *   - getConversationMessages() ↔ getThreadMessages()
 */
@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly client: WhatsAppHttpClient,
    private readonly configService: ConfigService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────────
  // WEBHOOK: Process incoming message from Meta
  // Called by WhatsAppController POST /whatsapp/webhook
  // ─────────────────────────────────────────────────────────────────────────────

  async handleIncomingMessage(payload: any): Promise<void> {
    // Meta Webhook payload structure:
    // { object: 'whatsapp_business_account', entry: [{ changes: [{ value: { messages: [...] } }] }] }
    const entry = payload?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value?.messages?.length) {
      // Not a message event (could be status update like delivered/read)
      this.handleStatusUpdate(value);
      return;
    }

    const myPhoneNumberId = this.configService.get<string>(
      'whatsapp.phoneNumberId',
    )!;

    for (const message of value.messages) {
      const wamid: string = message.id; // Meta's unique message ID
      const from: string = message.from; // Sender's phone (E.164 format)
      const messageType: string = message.type || 'text';

      // Only process text messages (others: image, document, etc. — extend as needed)
      const body: string =
        messageType === 'text'
          ? message.text?.body || ''
          : `[${messageType} message received]`;

      // Idempotency check — skip if already processed (equivalent to email's messageId check)
      const exists = await this.prisma.whatsAppMessage.findUnique({
        where: { messageId: wamid },
      });
      if (exists) {
        this.logger.log(`Message ${wamid} already processed. Skipping.`);
        continue;
      }

      // Find or create contact by phone number (equivalent to email contact by email address)
      let contact = await this.prisma.whatsAppContact.findUnique({
        where: { phone: from },
      });
      if (!contact) {
        const profileName: string | undefined = value.contacts?.find(
          (c: any) => c.wa_id === from,
        )?.profile?.name;

        contact = await this.prisma.whatsAppContact.create({
          data: { phone: from, name: profileName },
        });
        this.logger.log(
          `New WhatsApp contact created: ${from} (${profileName ?? 'unnamed'})`,
        );
      }

      // Find or create conversation (equivalent to email Thread, grouped by phone number)
      let conversation = await this.prisma.whatsAppConversation.findFirst({
        where: { contactId: contact.id },
        orderBy: { lastActivity: 'desc' },
      });
      if (!conversation) {
        conversation = await this.prisma.whatsAppConversation.create({
          data: { contactId: contact.id },
        });
        this.logger.log(
          `New WhatsApp conversation created for contact ${contact.id}`,
        );
      } else {
        // Update lastActivity timestamp
        await this.prisma.whatsAppConversation.update({
          where: { id: conversation.id },
          data: { lastActivity: new Date() },
        });
      }

      // Save the incoming message
      await this.prisma.whatsAppMessage.create({
        data: {
          conversationId: conversation.id,
          direction: 'INBOUND',
          from,
          to: myPhoneNumberId,
          body,
          messageId: wamid,
          type: messageType,
          status: 'received',
        },
      });

      this.logger.log(
        `Saved INBOUND message ${wamid} from ${from} to conversation ${conversation.id}`,
      );

      // Mark as read (shows double blue ticks on sender's device)
      try {
        await this.client.markAsRead(wamid);
      } catch (e) {
        this.logger.warn(
          `Could not mark message ${wamid} as read: ${e.message}`,
        );
      }
    }
  }

  private handleStatusUpdate(value: any): void {
    const statuses = value?.statuses;
    if (!statuses?.length) return;

    for (const status of statuses) {
      this.logger.log(
        `Status update for wamid=${status.id}: ${status.status} (to: ${status.recipient_id})`,
      );
      // Optionally update message.status in DB here
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SEND: Reply to an existing conversation (within 24-hour window)
  // ─────────────────────────────────────────────────────────────────────────────

  async sendReply(
    conversationId: string,
    text: string,
  ): Promise<{ success: boolean }> {
    const conversation = await this.prisma.whatsAppConversation.findUnique({
      where: { id: conversationId },
      include: { contact: true },
    });

    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    const to = conversation.contact.phone;
    const myPhoneNumberId = this.configService.get<string>(
      'whatsapp.phoneNumberId',
    )!;

    const { messageId: wamid } = await this.client.sendTextMessage(to, text);

    await this.prisma.whatsAppMessage.create({
      data: {
        conversationId,
        direction: 'OUTBOUND',
        from: myPhoneNumberId,
        to,
        body: text,
        messageId: wamid,
        type: 'text',
        status: 'sent',
      },
    });

    // Update conversation lastActivity
    await this.prisma.whatsAppConversation.update({
      where: { id: conversationId },
      data: { lastActivity: new Date() },
    });

    this.logger.log(
      `OUTBOUND message sent to ${to} in conversation ${conversationId}`,
    );
    return { success: true };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SEND: New message to any phone using an approved Template
  // Required for first contact OR after the 24-hour window expires
  // ─────────────────────────────────────────────────────────────────────────────

  async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode: string,
  ): Promise<{ success: boolean }> {
    const myPhoneNumberId = this.configService.get<string>(
      'whatsapp.phoneNumberId',
    )!;
    const { messageId: wamid } = await this.client.sendTemplateMessage(
      to,
      templateName,
      languageCode,
    );

    // Find or create contact + conversation for this number
    let contact = await this.prisma.whatsAppContact.findUnique({
      where: { phone: to },
    });
    if (!contact) {
      contact = await this.prisma.whatsAppContact.create({
        data: { phone: to },
      });
    }

    let conversation = await this.prisma.whatsAppConversation.findFirst({
      where: { contactId: contact.id },
      orderBy: { lastActivity: 'desc' },
    });
    if (!conversation) {
      conversation = await this.prisma.whatsAppConversation.create({
        data: { contactId: contact.id },
      });
    }

    await this.prisma.whatsAppMessage.create({
      data: {
        conversationId: conversation.id,
        direction: 'OUTBOUND',
        from: myPhoneNumberId,
        to,
        body: `[Template: ${templateName}]`,
        messageId: wamid,
        type: 'template',
        status: 'sent',
      },
    });

    return { success: true };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // READ: Query conversations and messages (equivalent to email getThreads())
  // ─────────────────────────────────────────────────────────────────────────────

  async getConversations() {
    return this.prisma.whatsAppConversation.findMany({
      orderBy: { lastActivity: 'desc' },
      include: {
        contact: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Include only the latest message as preview
        },
      },
    });
  }

  async getConversationMessages(conversationId: string) {
    return this.prisma.whatsAppMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getContacts() {
    return this.prisma.whatsAppContact.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        conversations: {
          orderBy: { lastActivity: 'desc' },
          take: 1,
        },
      },
    });
  }
}
