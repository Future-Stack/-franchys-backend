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
  private mediaClient: soap.Client | null = null;
  private pricingClient: soap.Client | null = null;

  private readonly username: string;
  private readonly password: string;
  private readonly productDataWsdl: string;
  private readonly inventoryWsdl: string;
  private readonly mediaContentWsdl: string;
  private readonly pricingWsdl: string;

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
    this.mediaContentWsdl = this.configService.get<string>(
      'sanmar.mediaContentWsdl',
      '',
    );
    this.pricingWsdl = this.configService.get<string>(
      'sanmar.pricingWsdl',
      '',
    );
  }

  async onModuleInit() {
    if (!this.username || !this.password) {
      this.logger.warn(
        '⚠️ SanMar credentials not set in .env (SANMAR_USERNAME / SANMAR_PASSWORD)',
      );
    }
  }

  private guardCredentials() {
    if (!this.username || !this.password || this.username === 'your_sanmar_username') {
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
        this.productClient = await soap.createClientAsync(this.productDataWsdl, {
          wsdl_options: { timeout: 15000 },
        });
      } catch (err) {
        this.logger.error(`Failed to load SanMar Product WSDL: ${err?.message}`);
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
        this.inventoryClient = await soap.createClientAsync(this.inventoryWsdl, {
          wsdl_options: { timeout: 15000 },
        });
      } catch (err) {
        this.logger.error(`Failed to load SanMar Inventory WSDL: ${err?.message}`);
        throw new ServiceUnavailableException(
          'Unable to connect to SanMar Inventory WSDL.',
        );
      }
    }
    return this.inventoryClient;
  }

  private async getMediaClient(): Promise<soap.Client> {
    if (!this.mediaClient) {
      if (!this.mediaContentWsdl) {
        throw new ServiceUnavailableException('SanMar media content WSDL URL is missing.');
      }
      try {
        this.mediaClient = await soap.createClientAsync(this.mediaContentWsdl, {
          wsdl_options: { timeout: 15000 },
        });
      } catch (err) {
        this.logger.error(`Failed to load SanMar Media WSDL: ${err?.message}`);
        throw new ServiceUnavailableException(
          'Unable to connect to SanMar Media WSDL.',
        );
      }
    }
    return this.mediaClient;
  }

  private async getPricingClient(): Promise<soap.Client> {
    if (!this.pricingClient) {
      if (!this.pricingWsdl) {
        throw new ServiceUnavailableException('SanMar pricing WSDL URL is missing.');
      }
      try {
        this.pricingClient = await soap.createClientAsync(this.pricingWsdl, {
          wsdl_options: { timeout: 15000 },
        });
      } catch (err) {
        this.logger.error(`Failed to load SanMar Pricing WSDL: ${err?.message}`);
        throw new ServiceUnavailableException(
          'Unable to connect to SanMar Pricing WSDL.',
        );
      }
    }
    return this.pricingClient;
  }

  private handleSoapError(err: any, contextMessage: string): never {
    const rawMsg = err?.message || err?.toString() || '';
    this.logger.error(`${contextMessage}: ${rawMsg}`);

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

    try {
      const fn = (client as any).GetProductAsync || (client as any).getProductAsync;
      if (typeof fn !== 'function') {
        throw new ServiceUnavailableException('GetProduct method not found on WSDL client.');
      }
      const [result] = await fn.call(client, args);
      return result;
    } catch (err) {
      this.handleSoapError(err, `GetProduct failed for style ${styleNo}`);
    }
  }

  /**
   * Fetch real Media / Image URLs for a product style
   */
  async getMediaContent(styleNo: string): Promise<any> {
    this.guardCredentials();
    const client = await this.getMediaClient();

    const args = {
      wsVersion: '1.1.0',
      id: this.username,
      password: this.password,
      mediaType: 'Image',
      productId: styleNo.trim(),
    };

    try {
      const fn =
        (client as any).GetMediaContentAsync ||
        (client as any).getMediaContentAsync;
      if (typeof fn !== 'function') {
        return null;
      }
      const [result] = await fn.call(client, args);
      return result;
    } catch (err) {
      this.logger.warn(`GetMediaContent soft failure for style ${styleNo}: ${err?.message}`);
      return null;
    }
  }

  /**
   * Fetch real Net Wholesale Pricing for a product style
   */
  async getPricingAndConfiguration(styleNo: string): Promise<any> {
    this.guardCredentials();
    const client = await this.getPricingClient();

    const args = {
      wsVersion: '1.0.0',
      id: this.username,
      password: this.password,
      productId: styleNo.trim(),
      currency: 'USD',
      priceType: 'Customer',
    };

    try {
      const fn =
        (client as any).GetPricingAndConfigurationAsync ||
        (client as any).getPricingAndConfigurationAsync;
      if (typeof fn !== 'function') {
        return null;
      }
      const [result] = await fn.call(client, args);
      return result;
    } catch (err) {
      this.logger.warn(`GetPricingAndConfiguration soft failure for style ${styleNo}: ${err?.message}`);
      return null;
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
      Filter: {
        partIdArray: null,
        LabelSizeArray: sizeName ? { labelSize: [sizeName] } : null,
        PartColorArray: colorName ? { partColor: [colorName] } : null,
      },
    };

    try {
      const fn =
        (client as any).GetInventoryLevelsAsync ||
        (client as any).getInventoryLevelsAsync;
      if (typeof fn !== 'function') {
        throw new ServiceUnavailableException('GetInventoryLevels method not found on WSDL.');
      }
      const [result] = await fn.call(client, args);
      return result;
    } catch (err) {
      this.handleSoapError(err, `GetInventoryLevels failed for style ${styleNo}`);
    }
  }
}
