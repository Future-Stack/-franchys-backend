import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

/**
 * WhatsAppHttpClient — thin wrapper around the Meta Graph API.
 * All credentials come from ConfigService (whatsapp.* namespace),
 * never directly from process.env.
 *
 * Equivalent to how the email-tracker module uses the `googleapis` npm client.
 */
@Injectable()
export class WhatsAppHttpClient {
  private readonly logger = new Logger(WhatsAppHttpClient.name);
  private readonly axios: AxiosInstance;
  private readonly phoneNumberId: string;

  constructor(private readonly configService: ConfigService) {
    this.phoneNumberId = this.configService.get<string>(
      'whatsapp.phoneNumberId',
    )!;
    const accessToken = this.configService.get<string>('whatsapp.accessToken')!;
    const graphApiBaseUrl = this.configService.get<string>(
      'whatsapp.graphApiBaseUrl',
    )!;

    this.axios = axios.create({
      baseURL: `${graphApiBaseUrl}/${this.phoneNumberId}`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    this.axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (axios.isAxiosError(error) && error.response?.data) {
          const metaError = error.response.data;
          this.logger.error(`WhatsApp API Error: ${JSON.stringify(metaError)}`);

          const errData = metaError?.error || {};
          let errorMessage = errData.message || 'WhatsApp API request failed';

          // Enhance Meta's generic error messages based on known API codes
          switch (errData.code) {
            case 190:
              errorMessage =
                'WhatsApp Authentication Failed (Code 190): Your Access Token is invalid or has expired. Please generate a new System User Token in Meta Business Suite and update WHATSAPP_ACCESS_TOKEN in your .env file.';
              break;
            case 131047:
              errorMessage =
                'WhatsApp 24-Hour Window Exceeded (Code 131047): You cannot send a free-form text message because more than 24 hours have passed since the customer last replied. You must send an approved Template message instead.';
              break;
            case 133010:
              errorMessage =
                'WhatsApp Invalid Recipient (Code 133010): The destination phone number is not registered on WhatsApp or the format is invalid.';
              break;
            case 131009:
              errorMessage =
                'WhatsApp Invalid Parameter (Code 131009): A parameter is missing or invalid. If sending a template, ensure the template name and language code exactly match what is approved in Meta Business Suite.';
              break;
            case 132000:
              errorMessage =
                'WhatsApp Template Paused/Disabled (Code 132000): The message template you are trying to use has been paused or disabled by Meta.';
              break;
          }

          throw new HttpException(
            {
              ...errData,
              message: errorMessage,
              originalMetaMessage: errData.message,
            },
            error.response.status || HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }
        throw error;
      },
    );
  }

  /**
   * Send a plain text message to a WhatsApp number.
   * Used for replies within the 24-hour customer service window.
   */
  async sendTextMessage(
    to: string,
    body: string,
  ): Promise<{ messageId: string }> {
    const response = await this.axios.post('/messages', {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { body },
    });

    const wamid: string = response.data?.messages?.[0]?.id ?? '';
    this.logger.log(`Text message sent to ${to}. wamid=${wamid}`);
    return { messageId: wamid };
  }

  /**
   * Send an approved Message Template.
   * REQUIRED when contacting a user after the 24-hour window has expired.
   * Template must be pre-approved in Meta Business Suite.
   */
  async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode: string,
  ): Promise<{ messageId: string }> {
    const response = await this.axios.post('/messages', {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
      },
    });

    console.log('Template message sent successfully', response);

    const wamid: string = response.data?.messages?.[0]?.id ?? '';
    this.logger.log(
      `Template message [${templateName}] sent to ${to}. wamid=${wamid}`,
    );
    return { messageId: wamid };
  }

  /**
   * Mark a received message as read.
   * This updates the double-tick status on the sender's phone.
   */
  async markAsRead(messageId: string): Promise<void> {
    await this.axios.post('/messages', {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    });
  }
}
