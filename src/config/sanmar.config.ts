import { registerAs } from '@nestjs/config';

export default registerAs('sanmar', () => ({
  username: process.env.SANMAR_USERNAME || '',
  password: process.env.SANMAR_PASSWORD || '',
  mode: process.env.SANMAR_MODE || 'test',
  sftpHost: process.env.SANMAR_SFTP_HOST || 'ftp.sanmar.com',
  sftpPort: parseInt(process.env.SANMAR_SFTP_PORT || '2200', 10),
  sftpUsername: process.env.SANMAR_SFTP_USERNAME || process.env.SANMAR_USERNAME || '',
  sftpPassword: process.env.SANMAR_SFTP_PASSWORD || process.env.SANMAR_PASSWORD || '',
  productDataWsdl:
    process.env.SANMAR_PRODUCT_WSDL ||
    'https://ws.sanmar.com:8080/promostandards/ProductDataServiceBinding?WSDL',
  inventoryWsdl:
    process.env.SANMAR_INVENTORY_WSDL ||
    'https://ws.sanmar.com:8080/promostandards/InventoryServiceBinding?WSDL',
  cacheTtlMs: parseInt(process.env.SANMAR_CACHE_TTL_MS || '21600000', 10),
}));
