import { registerAs } from '@nestjs/config';

export default registerAs('sanmar', () => ({
  username: process.env.SANMAR_USERNAME || '',
  password: process.env.SANMAR_PASSWORD || '',
  mode: process.env.SANMAR_MODE || 'test',
  // Use trim() so an empty-quoted env var ("") falls back to the default host
  sftpHost: (process.env.SANMAR_SFTP_HOST || '').trim() || 'ftp.sanmar.com',
  sftpPort: parseInt(process.env.SANMAR_SFTP_PORT || '2200', 10),
  sftpUsername: process.env.SANMAR_SFTP_USERNAME || process.env.SANMAR_USERNAME || '',
  sftpPassword: process.env.SANMAR_SFTP_PASSWORD || process.env.SANMAR_PASSWORD || '',
  productDataWsdl:
    process.env.SANMAR_PRODUCT_WSDL ||
    'https://ws.sanmar.com:8080/promostandards/ProductDataServiceBinding?WSDL',
  inventoryWsdl:
    process.env.SANMAR_INVENTORY_WSDL ||
    'https://ws.sanmar.com:8080/promostandards/InventoryServiceBinding?WSDL',
  // Media Content WSDL — provides product image URLs via GetMediaContent
  mediaContentWsdl:
    process.env.SANMAR_MEDIA_WSDL ||
    'https://ws.sanmar.com:8080/promostandards/MediaContentServiceBinding?WSDL',
  // Pricing WSDL — provides net wholesale pricing via GetPricingAndConfiguration
  pricingWsdl:
    process.env.SANMAR_PRICING_WSDL ||
    'https://ws.sanmar.com:8080/promostandards/PricingAndConfigurationServiceBinding?WSDL',
  cacheTtlMs: parseInt(process.env.SANMAR_CACHE_TTL_MS || '21600000', 10),
}));
