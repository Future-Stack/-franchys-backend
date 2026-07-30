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
  ): Promise<{
    success: boolean;
    is24HourWindowExpired?: boolean;
    message?: string;
  }> {
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
    const defaultTemplate =
      this.configService.get<string>('whatsapp.defaultTemplateName') ||
      'hello_world';
    const templateLang =
      this.configService.get<string>('whatsapp.defaultTemplateLanguage') ||
      'en_US';

    // Check 24-hour window by fetching the last INBOUND message from customer
    const lastInbound = await this.prisma.whatsAppMessage.findFirst({
      where: { conversationId, direction: 'INBOUND' },
      orderBy: { createdAt: 'desc' },
    });

    const isWindowExpired =
      !lastInbound ||
      Date.now() - new Date(lastInbound.createdAt).getTime() >
        24 * 60 * 60 * 1000;

    if (isWindowExpired) {
      this.logger.warn(
        `24-hour customer service window expired for conversation ${conversationId} (contact: ${to}). Automatically sending template '${defaultTemplate}'...`,
      );

      try {
        const { messageId: wamid } = await this.client.sendTemplateMessage(
          to,
          defaultTemplate,
          templateLang,
        );

        await this.prisma.whatsAppMessage.create({
          data: {
            conversationId,
            direction: 'OUTBOUND',
            from: myPhoneNumberId,
            to,
            body: `[Auto Template Re-engagement: ${defaultTemplate}] ${text}`,
            messageId: wamid,
            type: 'template',
            status: 'sent',
          },
        });

        await this.prisma.whatsAppConversation.update({
          where: { id: conversationId },
          data: { lastActivity: new Date() },
        });

        return {
          success: true,
          is24HourWindowExpired: true,
          message: `24-hour customer service window was expired. Automatically sent approved template '${defaultTemplate}' to re-engage customer.`,
        };
      } catch (templateErr: any) {
        this.logger.error(
          `Failed to auto-send template '${defaultTemplate}': ${templateErr.message}`,
        );
        throw templateErr;
      }
    }

    // Within 24-hour window: send free-form text message
    try {
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

      await this.prisma.whatsAppConversation.update({
        where: { id: conversationId },
        data: { lastActivity: new Date() },
      });

      this.logger.log(
        `OUTBOUND message sent to ${to} in conversation ${conversationId}`,
      );
      return { success: true };
    } catch (err: any) {
      // Dynamic fallback if Meta returns 24-hour window error (Code 131047)
      const isCode131047 =
        err?.status === 400 &&
        (err?.response?.code === 131047 ||
          err?.message?.includes('131047') ||
          err?.message?.includes('24-Hour'));

      if (isCode131047) {
        this.logger.warn(
          `Meta rejected text message (Code 131047). Attempting template fallback '${defaultTemplate}'...`,
        );

        const { messageId: wamid } = await this.client.sendTemplateMessage(
          to,
          defaultTemplate,
          templateLang,
        );

        await this.prisma.whatsAppMessage.create({
          data: {
            conversationId,
            direction: 'OUTBOUND',
            from: myPhoneNumberId,
            to,
            body: `[Auto Template Re-engagement: ${defaultTemplate}] ${text}`,
            messageId: wamid,
            type: 'template',
            status: 'sent',
          },
        });

        await this.prisma.whatsAppConversation.update({
          where: { id: conversationId },
          data: { lastActivity: new Date() },
        });

        return {
          success: true,
          is24HourWindowExpired: true,
          message: `24-hour customer service window was expired. Automatically sent approved template '${defaultTemplate}' to re-engage customer.`,
        };
      }
      throw err;
    }
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
    const messages = await this.prisma.whatsAppMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });

    // Get conversation + contact to resolve customer profileImage
    const conversation = await this.prisma.whatsAppConversation.findUnique({
      where: { id: conversationId },
      include: { contact: true },
    });

    let customerImage: string | null = null;
    if (conversation?.contact?.phone) {
      const customer = await this.prisma.customer.findFirst({
        where: { phone: conversation.contact.phone },
        select: { profileImage: true },
      });
      customerImage = customer?.profileImage ?? null;
    }

    return {
      contact: conversation?.contact
        ? {
            id: conversation.contact.id,
            phone: conversation.contact.phone,
            name: conversation.contact.name,
            profileImage: customerImage,
          }
        : null,
      messages,
    };
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

  // ─────────────────────────────────────────────────────────────────────────────
  // QUOTE DELIVERY: Send a quote notification via WhatsApp
  // Tries free-text first (works within 24h window), automatically falls back
  // to the approved `quote_delivery` template if the 24h window has expired.
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Send a quote notification to a customer's WhatsApp number.
   *
   * Strategy:
   *  1. Build a rich free-text message and try sendTextMessage().
   *  2. If Meta returns error code 131047 (24h window expired), automatically
   *     retry using the approved `quote_delivery` template with the same data.
   *  3. Any other error is rethrown so the caller can log it.
   *
   * Returns: { success: boolean; method: 'text' | 'template' }
   *
   * Approved template format (register this in Meta Business Suite):
   * ─────────────────────────────────────────────────────────────────────────
   *   Template name : quote_delivery
   *   Language      : English (en)
   *   Category      : UTILITY
   *
   *   Body text:
   *     Hello {{1}}! 👋
   *
   *     Your quote *{{2}}* from T-Price is ready for review.
   *     💰 Total: {{3}}
   *     📅 Due: {{4}}
   *
   *     View your quote here:
   *     {{5}}
   *
   *     Reply to this message if you have any questions!
   * ─────────────────────────────────────────────────────────────────────────
   */
  async sendQuoteMessage(
    phone: string,
    data: {
      customerName: string;
      quoteNumber: string;
      total: string;
      dueDate: string;
      quoteLink: string;
    },
  ): Promise<{ success: boolean; method: 'text' | 'template' }> {
    const myPhoneNumberId = this.configService.get<string>(
      'whatsapp.phoneNumberId',
    )!;

    // Build the free-text message body
    const textBody =
      `Hello ${data.customerName}! 👋\n\n` +
      `Your quote *${data.quoteNumber}* from T-Price is ready for review.\n` +
      `💰 Total: ${data.total}\n` +
      (data.dueDate ? `📅 Due: ${data.dueDate}\n` : '') +
      `\nView your quote here:\n${data.quoteLink}\n\n` +
      `Reply to this message if you have any questions!`;

    // ── Helper: find/create contact + conversation, save a message record ──
    const saveMessageRecord = async (
      wamid: string,
      body: string,
      type: string,
    ) => {
      let contact = await this.prisma.whatsAppContact.findUnique({
        where: { phone },
      });
      if (!contact) {
        contact = await this.prisma.whatsAppContact.create({
          data: { phone, name: data.customerName },
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
      } else {
        await this.prisma.whatsAppConversation.update({
          where: { id: conversation.id },
          data: { lastActivity: new Date() },
        });
      }

      await this.prisma.whatsAppMessage.create({
        data: {
          conversationId: conversation.id,
          direction: 'OUTBOUND',
          from: myPhoneNumberId,
          to: phone,
          body,
          messageId: wamid,
          type,
          status: 'sent',
        },
      });
    };

    // ── Step 1: Try free-text ──
    try {
      const { messageId } = await this.client.sendTextMessage(phone, textBody);
      await saveMessageRecord(messageId, textBody, 'text');
      this.logger.log(
        `[Quote WA] Sent free-text quote ${data.quoteNumber} to ${phone}`,
      );
      return { success: true, method: 'text' };
    } catch (err: any) {
      const code = err?.response?.code ?? err?.code;

      // 131047 = re-engagement message outside 24h window
      // Also handle 131009 (invalid param) as a signal to use template
      const needsTemplate = [131047, 133010].includes(Number(code));

      if (!needsTemplate) {
        this.logger.error(
          `[Quote WA] Free-text failed for ${phone} (code ${code}): ${err.message}`,
        );
        throw err;
      }

      this.logger.warn(
        `[Quote WA] 24h window expired for ${phone} (code ${code}). Falling back to template.`,
      );
    }

    // ── Step 2: Fallback — approved template ──
    const TEMPLATE_NAME = 'quote_delivery';
    const TEMPLATE_LANG = 'en';

    const { messageId } = await this.client.sendTemplateMessageWithComponents(
      phone,
      TEMPLATE_NAME,
      TEMPLATE_LANG,
      [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: data.customerName },
            { type: 'text', text: data.quoteNumber },
            { type: 'text', text: data.total },
            { type: 'text', text: data.dueDate || 'N/A' },
            { type: 'text', text: data.quoteLink },
          ],
        },
      ],
    );

    const templateBody = `[Template: ${TEMPLATE_NAME}] ${textBody}`;
    await saveMessageRecord(messageId, templateBody, 'template');

    this.logger.log(
      `[Quote WA] Sent template quote ${data.quoteNumber} to ${phone}`,
    );
    return { success: true, method: 'template' };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SEND: Invoice payment link via WhatsApp
  // ─────────────────────────────────────────────────────────────────────────────

  async sendInvoiceMessage(
    phone: string,
    data: {
      customerName: string;
      invoiceNumber: string;
      total: string;
      amountDue: string;
      dueDate?: string | null;
      hostedInvoiceUrl: string;
      installmentLabel?: string | null;
      isInstallment?: boolean;
    },
  ): Promise<{ success: boolean }> {
    const label =
      data.isInstallment && data.installmentLabel
        ? `Amount Due (${data.installmentLabel})`
        : 'Amount Due';

    const text =
      `Hi ${data.customerName},\n\n` +
      `Your invoice *${data.invoiceNumber}* is ready.\n` +
      `${label}: *${data.amountDue}*\n` +
      `Total Invoice Amount: *${data.total}*` +
      (data.dueDate ? ` (Due: ${data.dueDate})` : '') +
      `\n\nPay securely here:\n${data.hostedInvoiceUrl}\n\n` +
      `This link never expires. Contact us with any questions.`;

    // Find or create contact + conversation for tracking
    let contact = await this.prisma.whatsAppContact.findUnique({
      where: { phone },
    });
    if (!contact) {
      contact = await this.prisma.whatsAppContact.create({
        data: { phone },
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

    const myPhoneNumberId = this.configService.get<string>(
      'whatsapp.phoneNumberId',
    )!;
    const { messageId } = await this.client.sendTextMessage(phone, text);

    await this.prisma.whatsAppMessage.create({
      data: {
        conversationId: conversation.id,
        direction: 'OUTBOUND',
        from: myPhoneNumberId,
        to: phone,
        body: text,
        messageId,
        type: 'text',
        status: 'sent',
      },
    });

    await this.prisma.whatsAppConversation.update({
      where: { id: conversation.id },
      data: { lastActivity: new Date() },
    });

    this.logger.log(
      `[Invoice WA] Sent invoice ${data.invoiceNumber} payment link to ${phone}`,
    );
    return { success: true };
  }
}

