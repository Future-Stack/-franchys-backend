import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as soap from 'soap';

@Injectable()
export class SanMarSoapService implements OnModuleInit {
  private readonly logger = new Logger(SanMarSoapService.name);

  private productClient: soap.Client | null = null;
  private inventoryClient: soap.Client | null = null;

  private readonly username: string;
  private readonly password: string;
  private readonly productDataWsdl: string;
  private readonly inventoryWsdl: string;

  constructor(private readonly configService: ConfigService) {
    this.username = this.configService.get<string>('sanmar.username', '');
    this.password = this.configService.get<string>('sanmar.password', '');
    this.productDataWsdl = this.configService.get<string>(
      'sanmar.productDataWsdl',
      '',
    );
    this.inventoryWsdl = this.configService.get<string>(
      'sanmar.inventoryWsdl',
      '',
    );
  }

  async onModuleInit() {
    console.log('----------------------------------------------------');
    console.log('🔍 [SANMAR INIT] Username configured:', this.username ? 'YES' : 'NO');
    console.log('🔍 [SANMAR INIT] Password configured:', this.password ? 'YES' : 'NO');
    console.log('🔍 [SANMAR INIT] Product WSDL:', this.productDataWsdl);
    console.log('----------------------------------------------------');
  }

  private guardCredentials() {
    if (!this.username || !this.password || this.username === 'your_sanmar_username') {
      console.log('❌ [SANMAR ERROR] Missing credentials in .env');
      throw new UnauthorizedException(
        'SanMar credentials are missing or invalid in .env. Please set valid SANMAR_USERNAME and SANMAR_PASSWORD.',
      );
    }
  }

  private async getProductClient(): Promise<soap.Client> {
    if (!this.productClient) {
      if (!this.productDataWsdl) {
        throw new ServiceUnavailableException('SanMar product WSDL URL is missing.');
      }
      try {
        console.log('⏳ [SANMAR SOAP] Connecting to Product WSDL:', this.productDataWsdl);
        this.productClient = await soap.createClientAsync(this.productDataWsdl, {
          wsdl_options: { timeout: 15000 },
        });
        console.log('✅ [SANMAR SOAP] Product WSDL client connected successfully');
      } catch (err) {
        console.log('❌ [SANMAR SOAP ERROR] Failed to connect to Product WSDL:', err?.message);
        throw new ServiceUnavailableException(
          'Unable to connect to SanMar Web Service WSDL.',
        );
      }
    }
    return this.productClient;
  }

  private async getInventoryClient(): Promise<soap.Client> {
    if (!this.inventoryClient) {
      if (!this.inventoryWsdl) {
        throw new ServiceUnavailableException('SanMar inventory WSDL URL is missing.');
      }
      try {
        console.log('⏳ [SANMAR SOAP] Connecting to Inventory WSDL:', this.inventoryWsdl);
        this.inventoryClient = await soap.createClientAsync(this.inventoryWsdl, {
          wsdl_options: { timeout: 15000 },
        });
        console.log('✅ [SANMAR SOAP] Inventory WSDL client connected successfully');
      } catch (err) {
        console.log('❌ [SANMAR SOAP ERROR] Failed to connect to Inventory WSDL:', err?.message);
        throw new ServiceUnavailableException(
          'Unable to connect to SanMar Inventory WSDL.',
        );
      }
    }
    return this.inventoryClient;
  }

  private handleSoapError(err: any, contextMessage: string): never {
    const rawMsg = err?.message || err?.toString() || '';
    console.log(`❌ [SANMAR RAW ERROR] ${contextMessage}:`, rawMsg);

    if (
      rawMsg.includes('Authentication') ||
      rawMsg.includes('Invalid credentials') ||
      rawMsg.includes('Unauthorized') ||
      rawMsg.includes('Login failed')
    ) {
      throw new UnauthorizedException(
        'SanMar authentication failed. Please verify your sanmar.com username and password or email dealer@sanmar.com to request Web Services access.',
      );
    }

    throw new BadRequestException(
      `SanMar API Error: ${rawMsg.replace(/^S:Server:\s*/, '').split('\n')[0]}`,
    );
  }

  async getProduct(styleNo: string): Promise<any> {
    this.guardCredentials();
    const client = await this.getProductClient();

    if (!styleNo || styleNo.trim() === '') {
      throw new BadRequestException('Product style number (productId) is required.');
    }

    const args: any = {
      wsVersion: '1.0.0',
      id: this.username,
      password: this.password,
      localizationCountry: 'US',
      localizationLanguage: 'en',
      productId: styleNo.trim(),
    };

    console.log('🚀 [SANMAR REQUEST] Sending GetProduct SOAP request for style:', styleNo);
    console.log('📦 [SANMAR PAYLOAD]:', JSON.stringify({ ...args, password: '***' }, null, 2));

    try {
      const fn = (client as any).GetProductAsync || (client as any).getProductAsync;
      if (typeof fn !== 'function') {
        throw new ServiceUnavailableException('GetProduct method not found on WSDL client.');
      }
      const [result, rawResponse, soapHeader, rawRequest] = await fn.call(client, args);

      console.log('====================================================');
      console.log('📩 [SANMAR RAW SOAP RESPONSE]:');
      console.log(JSON.stringify(result, null, 2));
      console.log('====================================================');

      return result;
    } catch (err) {
      this.handleSoapError(err, `GetProduct failed for style ${styleNo}`);
    }
  }

  async getProductSellable(productId?: string): Promise<any> {
    this.guardCredentials();
    const client = await this.getProductClient();

    const targetId = productId && productId.trim() !== '' ? productId.trim() : '8000';

    const args = {
      wsVersion: '1.0.0',
      id: this.username,
      password: this.password,
      localizationCountry: 'US',
      localizationLanguage: 'en',
      productId: targetId,
      isSellable: true,
    };

    console.log('🚀 [SANMAR REQUEST] Sending GetProductSellable SOAP request for targetId:', targetId);

    try {
      const fn =
        (client as any).GetProductSellableAsync ||
        (client as any).getProductSellableAsync ||
        (client as any).GetProductAsync;

      if (typeof fn !== 'function') {
        throw new ServiceUnavailableException('Product search method not available on WSDL.');
      }

      const [result] = await fn.call(client, args);
      console.log('====================================================');
      console.log('📩 [SANMAR RAW SEARCH RESPONSE]:');
      console.log(JSON.stringify(result, null, 2));
      console.log('====================================================');
      return result;
    } catch (err) {
      this.handleSoapError(err, 'GetProductSellable failed');
    }
  }

  async getInventoryLevels(
    styleNo: string,
    colorName?: string,
    sizeName?: string,
  ): Promise<any> {
    this.guardCredentials();
    const client = await this.getInventoryClient();

    if (!styleNo || styleNo.trim() === '') {
      throw new BadRequestException('Style number is required for inventory lookup.');
    }

    const args = {
      wsVersion: '1.0.0',
      id: this.username,
      password: this.password,
      productId: styleNo.trim(),
      partId: '',
      Filter: {
        partIdArray: null,
        LabelSizeArray: sizeName ? { labelSize: [sizeName] } : null,
        PartColorArray: colorName ? { partColor: [colorName] } : null,
      },
    };

    console.log('🚀 [SANMAR REQUEST] Sending GetInventoryLevels for style:', styleNo);

    try {
      const fn =
        (client as any).GetInventoryLevelsAsync ||
        (client as any).getInventoryLevelsAsync;
      if (typeof fn !== 'function') {
        throw new ServiceUnavailableException('GetInventoryLevels method not found on WSDL.');
      }
      const [result] = await fn.call(client, args);
      console.log('====================================================');
      console.log('📩 [SANMAR RAW INVENTORY RESPONSE]:');
      console.log(JSON.stringify(result, null, 2));
      console.log('====================================================');
      return result;
    } catch (err) {
      this.handleSoapError(err, `GetInventoryLevels failed for style ${styleNo}`);
    }
  }
}
