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

  async handleWebhook(body: any) {
    try {
      const message = body?.message;
      if (!message || !message.data) return;

      const dataString = Buffer.from(message.data, 'base64').toString('utf-8');
      const data = JSON.parse(dataString);

      const auth = this.getAuthClient();
      const gmail = google.gmail({ version: 'v1', auth });

      const historyList = await gmail.users.history.list({
        userId: data.emailAddress,
        startHistoryId: data.historyId,
      });

      const histories = historyList.data.history;
      if (!histories) return;

      for (const history of histories) {
        const messagesAdded = history.messagesAdded || [];
        for (const msgInfo of messagesAdded) {
          if (!msgInfo.message || !msgInfo.message.id) continue;

          const fullMessage = await gmail.users.messages.get({
            userId: data.emailAddress,
            id: msgInfo.message.id,
            format: 'full'
          });

          const headers = fullMessage.data.payload?.headers || [];
          const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
          const from = headers.find(h => h.name === 'From')?.value || '';
          const to = headers.find(h => h.name === 'To')?.value || '';
          const messageId = headers.find(h => h.name === 'Message-ID')?.value || '';
          const inReplyTo = headers.find(h => h.name === 'In-Reply-To')?.value || null;
          const bodyContent = fullMessage.data.snippet || '';

          if (!messageId) continue;

          const exists = await this.prisma.message.findUnique({ where: { messageId } });
          if (exists) continue;

          let threadId;
          if (inReplyTo) {
            const existingMsg = await this.prisma.message.findUnique({ where: { messageId: inReplyTo } });
            threadId = existingMsg ? existingMsg.threadId : null;
          }

          if (!threadId) {
            let contact = await this.prisma.contact.findUnique({ where: { email: data.emailAddress } });
            if (!contact) {
              contact = await this.prisma.contact.create({ data: { email: data.emailAddress } });
            }

            const newThread = await this.prisma.thread.create({
              data: { subject, contactId: contact.id }
            });
            threadId = newThread.id;
          }

          await this.prisma.message.create({
            data: {
              threadId,
              direction: from.includes(data.emailAddress) ? "OUTBOUND" : "INBOUND",
              from,
              to,
              body: bodyContent,
              messageId,
              inReplyTo
            }
          });
        }
      }
    } catch (error) {
      this.logger.error('Error handling webhook', error);
    }
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
}
