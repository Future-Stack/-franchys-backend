import { registerAs } from '@nestjs/config';

export default registerAs('whatsapp', () => ({
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
  verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || '',
  appId: process.env.WHATSAPP_APP_ID || '',
  appSecret: process.env.WHATSAPP_APP_SECRET || '',
  graphApiVersion: process.env.WHATSAPP_GRAPH_API_VERSION || 'v19.0',
  graphApiBaseUrl: `https://graph.facebook.com/${process.env.WHATSAPP_GRAPH_API_VERSION || 'v19.0'}`,
}));
