import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { google } from 'googleapis';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EmailTrackerService {
  private readonly logger = new Logger(EmailTrackerService.name);

  constructor(private prisma: PrismaService) { }

  private getAuthClient() {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRATE || process.env.GOOGLE_CLIENT_SECRET,
    );
    auth.setCredentials({
      access_token: process.env.GOOGLE_USER_ACCESS_TOKEN,
      refresh_token: process.env.GOOGLE_USER_REFRESH_TOKEN
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
        this.logger.warn('GOOGLE_PUB_SUB_TOPIC not found in env. Skipping watch renewal.');
        return;
      }

      const response = await gmail.users.watch({
        userId: 'me',
        requestBody: {
          topicName: topicName,
          labelIds: ['INBOX', 'SENT'],
        },
      });
      console.log("Success email automation");
      this.logger.log(`Watch started till: ${response.data.expiration}`);
    } catch (error) {
      this.logger.error('Failed to renew Gmail watch', error);
    }
  }

  @Cron('*/5 * * * *')
  async syncEmails() {
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
          format: 'full'
        });

        const headers = fullMessage.data.payload?.headers || [];
        const subject = headers.find(h => h.name?.toLowerCase() === 'subject')?.value || 'No Subject';
        const from = headers.find(h => h.name?.toLowerCase() === 'from')?.value || '';
        const to = headers.find(h => h.name?.toLowerCase() === 'to')?.value || '';
        const messageId = headers.find(h => h.name?.toLowerCase() === 'message-id')?.value || '';
        const inReplyTo = headers.find(h => h.name?.toLowerCase() === 'in-reply-to')?.value || null;
        // Helper to extract the actual email body from payload parts
        const getBodyData = (payload: any): string => {
          if (!payload) return '';
          if (payload.parts) {
            let body = '';
            for (const part of payload.parts) {
              if (part.mimeType === 'text/plain' && part.body?.data) {
                return Buffer.from(part.body.data, 'base64').toString('utf8');
              } else if (part.parts) {
                body = getBodyData(part) || body;
              }
            }
            if (body) return body;
            // Fallback to text/html if text/plain is not found
            for (const part of payload.parts) {
              if (part.mimeType === 'text/html' && part.body?.data) {
                return Buffer.from(part.body.data, 'base64').toString('utf8');
              }
            }
          } else if (payload.body && payload.body.data) {
            return Buffer.from(payload.body.data, 'base64').toString('utf8');
          }
          return '';
        };

        const decodedBody = getBodyData(fullMessage.data.payload);
        let bodyContent = decodedBody || fullMessage.data.snippet || '';

        // Clean up any remaining HTML entities that Gmail might leave in the text
        bodyContent = bodyContent
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");

        // Strip out the quoted reply history (e.g., "On Wed, Jun 24, 2026 at 1:28 PM User wrote:")
        bodyContent = bodyContent.split(/(?:\r?\n)+On .*? wrote:\r?\n/)[0].trim();

        if (!messageId) {
          this.logger.warn(`Message ${msgInfo.id} skipped: No Message-ID header found.`);
          continue;
        }

        const exists = await this.prisma.message.findUnique({ where: { messageId } });
        if (exists) continue;

        this.logger.log(`Processing new message: "${subject}" from ${from}`);

        const isOutbound = from.includes(emailAddress);
        const direction = isOutbound ? "OUTBOUND" : "INBOUND";

        let contactString = isOutbound ? to : from;
        const emailMatch = contactString.match(/<([^>]+)>/);
        const contactEmail = emailMatch ? emailMatch[1].trim() : contactString.trim();

        let threadId;
        if (inReplyTo) {
          const existingMsg = await this.prisma.message.findUnique({ where: { messageId: inReplyTo } });
          threadId = existingMsg ? existingMsg.threadId : null;
        }

        if (!threadId) {
          let contact = await this.prisma.contact.findUnique({ where: { email: contactEmail } });
          if (!contact) {
            contact = await this.prisma.contact.create({ data: { email: contactEmail } });
            this.logger.log(`Created new contact: ${contactEmail}`);
          }

          const newThread = await this.prisma.thread.create({
            data: { subject, contactId: contact.id }
          });
          threadId = newThread.id;
          this.logger.log(`Created new thread: ${threadId}`);
        }

        await this.prisma.message.create({
          data: {
            threadId,
            direction,
            from,
            to,
            body: bodyContent,
            messageId,
            inReplyTo
          }
        });

        this.logger.log(`Successfully saved message ${messageId} to thread ${threadId}`);
      }
    } catch (error) {
      this.logger.error('Error in automatic email sync', error);
    }
  }

  async handleWebhook(body: any) {
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
      include: { thread: true }
    });

    if (!lastMessage) throw new Error('Thread or last message not found');

    const str = [
      `To: ${lastMessage.from}`,
      `Subject: Re: ${lastMessage.thread.subject}`,
      `In-Reply-To: ${lastMessage.messageId}`,
      `References: ${lastMessage.messageId}`,
      `Content-Type: text/html; charset=utf-8`,
      `MIME-Version: 1.0`,
      '',
      replyText
    ].join('\n');

    const encodedMail = Buffer.from(str).toString("base64").replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMail,
      }
    });
  }

  async getThreads() {
    return this.prisma.thread.findMany({
      orderBy: { lastActivity: 'desc' },
      include: { contact: true }
    });
  }

  async getThreadMessages(threadId: string) {
    return this.prisma.message.findMany({
      where: { threadId },
      orderBy: { createdAt: 'asc' }
    });
  }

  async getContacts() {
    return this.prisma.contact.findMany({
      orderBy: { email: 'asc' },
      include: {
        threads: {
          orderBy: { lastActivity: 'desc' },
          take: 1
        }
      }
    });
  }

  async getContactConversations(contactId: string) {
    return this.prisma.thread.findMany({
      where: { contactId },
      orderBy: { lastActivity: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });
  }
}
