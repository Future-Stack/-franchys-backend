import { registerAs } from '@nestjs/config';

export default registerAs('sanmar', () => ({
  username: process.env.SANMAR_USERNAME || '',
  password: process.env.SANMAR_PASSWORD || '',
  mode: process.env.SANMAR_MODE || 'test',
  productDataWsdl:
    process.env.SANMAR_PRODUCT_WSDL ||
    'https://ws.sanmar.com:8080/promostandards/ProductDataServiceBinding?WSDL',
  inventoryWsdl:
    process.env.SANMAR_INVENTORY_WSDL ||
    'https://ws.sanmar.com:8080/promostandards/InventoryServiceBinding?WSDL',
  cacheTtlMs: parseInt(process.env.SANMAR_CACHE_TTL_MS || '21600000', 10),
}));
