import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { google } from 'googleapis';
import { PrismaService } from '../../prisma/prisma.service';

function stripHtml(html: string): string {
  if (!html) return '';
  let text = html;

  // 1. Remove style and script tags and their content
  text = text.replace(/<(style|script)[^>]*>[\s\S]*?<\/\1>/gi, '');

  // 2. Replace block level tags with newlines to preserve readability
  text = text.replace(/<\/p>|<\/div>|<\/tr>|<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/li>/gi, '\n');

  // 3. Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // 4. Decode common HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // 5. Clean up extra whitespace/newlines
  text = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');

  return text.trim();
}

function parseStructuredEmail(subject: string, htmlBody: string): { isStructured: boolean; body: string } {
  const subjectLower = subject.toLowerCase();

  try {
    // 1. QUOTE DELIVERY EMAIL
    if (subjectLower.includes('your quote') && subjectLower.includes('ready')) {
      const quoteNumberMatch = subject.match(/(Q-\d+)/i) || subject.match(/Quote\s+(\S+)/i);
      const quoteNumber = quoteNumberMatch ? quoteNumberMatch[1] : 'Unknown';

      const linkMatch = htmlBody.match(/class="cta-btn"\s+href="([^"]+)"/i) || htmlBody.match(/href="([^"]+)"/i);
      const quoteLink = linkMatch ? linkMatch[1] : '';

      const totalMatch = htmlBody.match(/class="summary-value total">([^<]+)</i);
      const total = totalMatch ? totalMatch[1].trim() : '';

      const customerMatch = htmlBody.match(/Hello,\s+([^!]+)!/i);
      const customerName = customerMatch ? customerMatch[1].trim() : '';

      const dueDateMatch = htmlBody.match(/Due Date<\/span>\s*<span class="summary-value">([^<]+)</i);
      const dueDate = dueDateMatch ? dueDateMatch[1].trim() : '';

      return {
        isStructured: true,
        body: JSON.stringify({
          type: 'QUOTE',
          quoteNumber,
          customerName,
          total,
          dueDate,
          quoteLink,
          message: `Quote ${quoteNumber} was sent to customer.`,
          link: quoteLink,
        }),
      };
    }

    // 2. INVOICE DELIVERY EMAIL
    if (subjectLower.includes('invoice') && subjectLower.includes('payment due')) {
      const invoiceNumberMatch = subject.match(/(INV-\d+)/i) || subject.match(/Invoice\s+(\S+)/i);
      const invoiceNumber = invoiceNumberMatch ? invoiceNumberMatch[1] : 'Unknown';

      const linkMatch = htmlBody.match(/class="pay-btn"\s+href="([^"]+)"/i) || htmlBody.match(/href="([^"]+)"/i);
      const hostedInvoiceUrl = linkMatch ? linkMatch[1] : '';

      const customerMatch = htmlBody.match(/Hi\s+<strong>([^<]+)<\/strong>/i);
      const customerName = customerMatch ? customerMatch[1].trim() : '';

      const amountDueMatch = htmlBody.match(/Amount Due<\/div>\s*<div class="value">([^<]+)<\/div>/i) || 
                              htmlBody.match(/Amount Due\s*\(([^)]+)\)<\/div>\s*<div class="value">([^<]+)<\/div>/i);
      let amountDue = '';
      if (amountDueMatch) {
        amountDue = amountDueMatch.length === 3 ? amountDueMatch[2].trim() : amountDueMatch[1].trim();
      }

      const totalMatch = htmlBody.match(/Total Invoice Amount<\/span>\s*<span class="meta-value">([^<]+)</i);
      const total = totalMatch ? totalMatch[1].trim() : '';

      const dueDateMatch = htmlBody.match(/Due Date<\/span>\s*<span class="meta-value">([^<]+)</i);
      const dueDate = dueDateMatch ? dueDateMatch[1].trim() : '';

      return {
        isStructured: true,
        body: JSON.stringify({
          type: 'INVOICE',
          invoiceNumber,
          customerName,
          total,
          amountDue,
          dueDate,
          hostedInvoiceUrl,
          message: `Invoice ${invoiceNumber} payment link was sent to customer.`,
          link: hostedInvoiceUrl,
        }),
      };
    }
  } catch (err) {
    // Fallback
  }

  return { isStructured: false, body: '' };
}

@Injectable()
export class EmailTrackerService {
  private readonly logger = new Logger(EmailTrackerService.name);
  private isSyncing = false;

  constructor(private prisma: PrismaService) {}

  private getAuthClient() {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRATE || process.env.GOOGLE_CLIENT_SECRET,
    );
    auth.setCredentials({
      access_token: process.env.GOOGLE_USER_ACCESS_TOKEN,
      refresh_token: process.env.GOOGLE_USER_REFRESH_TOKEN,
    });
    return auth;
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async startGmailWatch() {
    try {
      this.logger.log('Starting Gmail watch renewal...');
      const auth = this.getAuthClient();
      const gmail = google.gmail({ version: 'v1', auth });

      const topicName = process.env.GOOGLE_PUB_SUB_TOPIC;
      if (!topicName) {
        this.logger.warn(
          'GOOGLE_PUB_SUB_TOPIC not found in env. Skipping watch renewal.',
        );
        return;
      }

      const response = await gmail.users.watch({
        userId: 'me',
        requestBody: {
          topicName: topicName,
          labelIds: ['INBOX', 'SENT'],
        },
      });
      this.logger.log(`Watch started till: ${response.data.expiration}`);
    } catch (error) {
      this.logger.error('Failed to renew Gmail watch', error);
    }
  }

  @Cron('*/5 * * * *')
  async syncEmails() {
    if (this.isSyncing) {
      this.logger.log('Email sync is already running. Skipping concurrent run.');
      return;
    }
    this.isSyncing = true;

    try {
      this.logger.log('Running automatic email sync...');
      const auth = this.getAuthClient();
      const gmail = google.gmail({ version: 'v1', auth });

      const profile = await gmail.users.getProfile({ userId: 'me' });
      const emailAddress = profile.data.emailAddress;
      if (!emailAddress) return;

      const messageList = await gmail.users.messages.list({
        userId: emailAddress,
        maxResults: 10,
        q: 'in:inbox OR in:sent',
      });

      const messages = messageList.data.messages || [];
      if (messages.length > 0) {
        this.logger.log(`Found ${messages.length} recent messages to check.`);
      }

      for (const msgInfo of messages.reverse()) {
        if (!msgInfo.id) continue;

        const fullMessage = await gmail.users.messages.get({
          userId: emailAddress,
          id: msgInfo.id,
          format: 'full',
        });

        const headers = fullMessage.data.payload?.headers || [];
        const subject =
          headers.find((h) => h.name?.toLowerCase() === 'subject')?.value ||
          'No Subject';
        const from =
          headers.find((h) => h.name?.toLowerCase() === 'from')?.value || '';
        const to =
          headers.find((h) => h.name?.toLowerCase() === 'to')?.value || '';
        const messageId =
          headers.find((h) => h.name?.toLowerCase() === 'message-id')?.value ||
          '';
        const inReplyTo =
          headers.find((h) => h.name?.toLowerCase() === 'in-reply-to')?.value ||
          null;

        // Filter out system transactional emails and bounces
        const senderLower = from.toLowerCase();
        if (
          senderLower.includes('mailer-daemon') ||
          senderLower.includes('no-reply') ||
          senderLower.includes('noreply')
        ) {
          this.logger.log(`Skipping system email sender: ${from}`);
          continue;
        }

        const subjectLower = subject.toLowerCase();
        if (
          subjectLower.includes('verify your email') ||
          subjectLower.includes('password reset') ||
          subjectLower.includes('verification code')
        ) {
          this.logger.log(`Skipping system transactional email subject: "${subject}"`);
          continue;
        }

        if (!messageId) {
          this.logger.warn(
            `Message ${msgInfo.id} skipped: No Message-ID header found.`,
          );
          continue;
        }

        const exists = await this.prisma.message.findUnique({
          where: { messageId },
        });
        if (exists) continue;

        // Helper to extract HTML body
        const getHtmlBody = (payload: any): string => {
          if (!payload) return '';
          if (payload.parts) {
            for (const part of payload.parts) {
              if (part.mimeType === 'text/html' && part.body?.data) {
                return Buffer.from(part.body.data, 'base64').toString('utf8');
              } else if (part.parts) {
                const nested = getHtmlBody(part);
                if (nested) return nested;
              }
            }
          } else if (payload.mimeType === 'text/html' && payload.body && payload.body.data) {
            return Buffer.from(payload.body.data, 'base64').toString('utf8');
          }
          return '';
        };

        // Helper to extract Plain Text body
        const getPlainBody = (payload: any): string => {
          if (!payload) return '';
          if (payload.parts) {
            for (const part of payload.parts) {
              if (part.mimeType === 'text/plain' && part.body?.data) {
                return Buffer.from(part.body.data, 'base64').toString('utf8');
              } else if (part.parts) {
                const nested = getPlainBody(part);
                if (nested) return nested;
              }
            }
          } else if (payload.mimeType === 'text/plain' && payload.body && payload.body.data) {
            return Buffer.from(payload.body.data, 'base64').toString('utf8');
          }
          return '';
        };

        const htmlBody = getHtmlBody(fullMessage.data.payload);
        const plainBody = getPlainBody(fullMessage.data.payload);

        let bodyContent = '';
        
        // Try parsing structured quote/invoice templates first
        const structured = parseStructuredEmail(subject, htmlBody);
        if (structured.isStructured) {
          bodyContent = structured.body;
        } else {
          const rawBody = plainBody || (htmlBody ? stripHtml(htmlBody) : '') || fullMessage.data.snippet || '';

          // Clean up HTML entities in plain text fallback
          bodyContent = rawBody
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");

          // Strip out reply history
          bodyContent = bodyContent
            .split(/(?:\r?\n)+On .*? wrote:\r?\n/)[0]
            .trim();
        }

        this.logger.log(`Processing new message: "${subject}" from ${from}`);

        const systemEmail = process.env.MAIL_USER || emailAddress;
        const isOutbound =
          from.toLowerCase().includes(emailAddress.toLowerCase()) ||
          from.toLowerCase().includes(systemEmail.toLowerCase());
        const direction = isOutbound ? 'OUTBOUND' : 'INBOUND';

        const contactString = isOutbound ? to : from;
        const emailMatch = contactString.match(/<([^>]+)>/);
        const contactEmail = (emailMatch
          ? emailMatch[1]
          : contactString
        ).trim().toLowerCase();

        let contactName: string | null = null;
        if (emailMatch) {
          const rawName = contactString.split('<')[0].trim();
          contactName = rawName.replace(/^["']|["']$/g, '').trim() || null;
        }

        let contact = await this.prisma.contact.findUnique({
          where: { email: contactEmail },
        });

        if (!contact) {
          // Check if contact exists in the CRM Customer directory
          const customerExists = await this.prisma.customer.findUnique({
            where: { email: contactEmail },
          });

          if (customerExists) {
            contact = await this.prisma.contact.create({
              data: {
                email: contactEmail,
                name: customerExists.firstName && customerExists.lastName
                  ? `${customerExists.firstName} ${customerExists.lastName}`
                  : customerExists.firstName || null,
              },
            });
            this.logger.log(`Auto-created tracking contact from Customer CRM: ${contactEmail}`);
          } else if (structured.isStructured) {
            // Since it is a system quote/invoice email, we must track it! Create a generic contact.
            contact = await this.prisma.contact.create({
              data: {
                email: contactEmail,
                name: contactName,
              },
            });
            this.logger.log(`Created tracking contact for system-sent quote/invoice: ${contactEmail}`);
          }
        } else if (contactName && !contact.name) {
          contact = await this.prisma.contact.update({
            where: { id: contact.id },
            data: { name: contactName },
          });
          this.logger.log(`Updated contact name for ${contactEmail} to: ${contactName}`);
        }

        // If contact still does not exist, skip syncing this message (irrelevant sender/recipient)
        if (!contact) {
          this.logger.log(`Skipping untracked email from/to: ${contactEmail}`);
          continue;
        }

        let threadId;
        if (inReplyTo) {
          const existingMsg = await this.prisma.message.findUnique({
            where: { messageId: inReplyTo },
          });
          threadId = existingMsg ? existingMsg.threadId : null;
        }

        if (!threadId) {
          // Check if contact already has a thread
          const existingThread = await this.prisma.thread.findFirst({
            where: { contactId: contact.id },
            orderBy: { lastActivity: 'desc' },
          });

          if (existingThread) {
            threadId = existingThread.id;
            await this.prisma.thread.update({
              where: { id: threadId },
              data: {
                lastActivity: new Date(),
                subject: subject,
              },
            });
            this.logger.log(`Reused existing thread ${threadId} for contact ${contactEmail}`);
          } else {
            const newThread = await this.prisma.thread.create({
              data: { subject, contactId: contact.id },
            });
            threadId = newThread.id;
            this.logger.log(`Created new thread: ${threadId}`);
          }
        }

        const internalDate = fullMessage.data.internalDate;
        const messageDate = internalDate ? new Date(parseInt(internalDate, 10)) : new Date();

        await this.prisma.message.create({
          data: {
            threadId,
            direction,
            from,
            to,
            body: bodyContent,
            messageId,
            inReplyTo,
            createdAt: messageDate,
          },
        });

        this.logger.log(
          `Successfully saved message ${messageId} to thread ${threadId}`,
        );
      }
    } catch (error) {
      this.logger.error('Error in automatic email sync', error);
    } finally {
      this.isSyncing = false;
    }
  }

  async handleWebhook(body: any) {
    this.logger.log(`Received webhook notification: ${JSON.stringify(body)}`);
    // Keep this function so the controller doesn't break,
    // but just forward it to the syncEmails function to pull immediately.
    return this.syncEmails();
  }

  async sendFollowUpEmail(threadId: string, replyText: string) {
    const auth = this.getAuthClient();
    const gmail = google.gmail({ version: 'v1', auth });

    const lastMessage = await this.prisma.message.findFirst({
      where: { threadId },
      orderBy: { createdAt: 'desc' },
      include: { thread: true },
    });

    if (!lastMessage) throw new Error('Thread or last message not found');

    const recipient = lastMessage.direction === 'OUTBOUND' ? lastMessage.to : lastMessage.from;
    const profile = await gmail.users.getProfile({ userId: 'me' });
    const myEmail = profile.data.emailAddress;

    let subject = lastMessage.thread.subject;
    if (!subject.toLowerCase().startsWith('re:')) {
      subject = `Re: ${subject}`;
    }

    const str = [
      `To: ${recipient}`,
      `Subject: ${subject}`,
      `In-Reply-To: ${lastMessage.messageId}`,
      `References: ${lastMessage.messageId}`,
      `Content-Type: text/html; charset=utf-8`,
      `MIME-Version: 1.0`,
      '',
      replyText,
    ].join('\n');

    const encodedMail = Buffer.from(str)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const sent = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMail,
      },
    });

    const wamid = sent.data.id;

    if (wamid) {
      await this.prisma.message.create({
        data: {
          threadId,
          direction: 'OUTBOUND',
          from: myEmail || 'me',
          to: recipient,
          body: replyText,
          messageId: wamid,
          inReplyTo: lastMessage.messageId,
        },
      });

      await this.prisma.thread.update({
        where: { id: threadId },
        data: { lastActivity: new Date() },
      });
    }
  }

  async getThreads() {
    const threads = await this.prisma.thread.findMany({
      orderBy: { lastActivity: 'desc' },
      include: { contact: true },
    });
    return threads.map((t) => ({
      ...t,
      customerName: t.contact?.name || t.contact?.email || 'Unknown',
    }));
  }

  async getThreadMessages(threadId: string) {
    const messages = await this.prisma.message.findMany({
      where: { threadId },
      orderBy: { createdAt: 'asc' },
    });

    // Get thread + contact to resolve customer profileImage
    const thread = await this.prisma.thread.findUnique({
      where: { id: threadId },
      include: { contact: true },
    });

    let customerImage: string | null = null;
    if (thread?.contact?.email) {
      const customer = await this.prisma.customer.findUnique({
        where: { email: thread.contact.email },
        select: { profileImage: true },
      });
      customerImage = customer?.profileImage ?? null;
    }

    return {
      contact: thread?.contact
        ? {
            id: thread.contact.id,
            email: thread.contact.email,
            name: thread.contact.name,
            profileImage: customerImage,
          }
        : null,
      messages,
    };
  }

  async getContacts() {
    return this.prisma.contact.findMany({
      orderBy: { email: 'asc' },
      include: {
        threads: {
          orderBy: { lastActivity: 'desc' },
          take: 1,
        },
      },
    });
  }

  async getContactConversations(contactId: string) {
    return this.prisma.thread.findMany({
      where: { contactId },
      orderBy: { lastActivity: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }
}
