import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

export interface SanMarCsvVariant {
  style: string;
  colorName: string;
  colorCode?: string;
  productTitle?: string;
  description?: string;
  brand?: string;
  category?: string;
  subCategory?: string;
  piecePrice: number;
  casePrice: number;
  salePrice?: number;
  primaryImageUrl?: string;
  colorSquareUrl?: string;
  images: string[];
}

@Injectable()
export class SanMarSftpService implements OnModuleInit {
  private readonly logger = new Logger(SanMarSftpService.name);

  private readonly sftpHost: string;
  private readonly sftpPort: number;
  private readonly sftpUsername: string;
  private readonly sftpPassword: string;

  private readonly localDataDir = path.join(process.cwd(), 'data', 'sanmar');
  private readonly localCsvFile = path.join(this.localDataDir, 'SanMar_EPDD.csv');

  // Fast In-Memory Map: "STYLE_COLOR" => SanMarCsvVariant
  private catalogMap = new Map<string, SanMarCsvVariant>();
  // Fast Style Index: "STYLE" => SanMarCsvVariant[]
  private styleIndexMap = new Map<string, SanMarCsvVariant[]>();

  constructor(private readonly configService: ConfigService) {
    this.sftpHost = this.configService.get<string>('sanmar.sftpHost', 'ftp.sanmar.com');
    this.sftpPort = this.configService.get<number>('sanmar.sftpPort', 2200);
    this.sftpUsername = this.configService.get<string>('sanmar.sftpUsername', '');
    this.sftpPassword = this.configService.get<string>('sanmar.sftpPassword', '');
  }

  async onModuleInit() {
    // If local CSV file exists, parse it immediately on startup
    if (fs.existsSync(this.localCsvFile)) {
      this.logger.log(`Found existing SanMar CSV file at ${this.localCsvFile}. Loading catalog…`);
      this.parseCsvFile(this.localCsvFile);
    } else {
      this.logger.log('No local SanMar CSV file found yet. Call POST /api/v1/sanmar/sync-sftp to download.');
    }
  }

  /**
   * Downloads SanMar_EPDD.csv from ftp.sanmar.com:2200/SanmarPDD/SanMar_EPDD.csv
   */
  async syncSftpCatalog(): Promise<{ success: boolean; totalVariants: number; message: string }> {
    if (!this.sftpUsername || !this.sftpPassword) {
      this.logger.warn('SFTP Username/Password missing in .env. Skipping download.');
      return {
        success: false,
        totalVariants: this.catalogMap.size,
        message: 'SFTP credentials (SANMAR_SFTP_USERNAME / SANMAR_SFTP_PASSWORD) missing in .env',
      };
    }

    // Dynamically import ssh2-sftp-client
    let Client: any;
    try {
      Client = require('ssh2-sftp-client');
    } catch {
      throw new Error('ssh2-sftp-client package is required for SFTP sync.');
    }

    const sftp = new Client();

    try {
      this.logger.log(`Connecting to SFTP ${this.sftpHost}:${this.sftpPort} as ${this.sftpUsername}…`);
      await sftp.connect({
        host: this.sftpHost,
        port: this.sftpPort,
        username: this.sftpUsername,
        password: this.sftpPassword,
        algorithms: {
          serverHostKey: ['ssh-rsa', 'ssh-dss'],
        },
      });

      if (!fs.existsSync(this.localDataDir)) {
        fs.mkdirSync(this.localDataDir, { recursive: true });
      }

      const remotePath = '/SanmarPDD/SanMar_EPDD.csv';
      this.logger.log(`Downloading ${remotePath} -> ${this.localCsvFile}…`);
      await sftp.fastGet(remotePath, this.localCsvFile);
      await sftp.end();

      this.logger.log('SFTP download completed successfully! Parsing CSV data…');
      this.parseCsvFile(this.localCsvFile);

      return {
        success: true,
        totalVariants: this.catalogMap.size,
        message: `Successfully downloaded and loaded ${this.catalogMap.size} product variants from SanMar SFTP!`,
      };
    } catch (err) {
      this.logger.error(`SFTP sync failed: ${err?.message}`);
      await sftp.end().catch(() => {});
      return {
        success: false,
        totalVariants: this.catalogMap.size,
        message: `SFTP sync error: ${err?.message}`,
      };
    }
  }

  /**
   * Parses the SanMar_EPDD.csv file and populates in-memory lookup maps
   */
  public parseCsvFile(filePath: string): void {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const records: Record<string, any>[] = parse(fileBuffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      this.catalogMap.clear();
      this.styleIndexMap.clear();

      for (const row of records) {
        const style = (row.STYLE_NUM || row.STYLE || row.PRODUCT_STYLE || '').trim().toUpperCase();
        const colorName = (row.COLOR_NAME || row.COLOR || '').trim();

        if (!style || !colorName) continue;

        const key = `${style}_${colorName.toLowerCase()}`;

        const piecePrice = parseFloat(row.PIECE_PRICE || row.PIECE_PRICE_NET || row.PRICE || '0') || 0;
        const casePrice = parseFloat(row.CASE_PRICE || row.CASE_PRICE_NET || '0') || piecePrice;
        const salePrice = parseFloat(row.SALE_PRICE || '0') || undefined;

        const primaryImageUrl = row.PRIMARY_IMAGE_URL || row.HIGH_RES_FRONT_IMAGE || row.FRONT_MODEL_IMAGE || undefined;
        const colorSquareUrl = row.COLOR_SQUARE_IMAGE || row.COLOR_SWATCH_IMAGE || undefined;

        const imagesSet = new Set<string>();
        if (colorSquareUrl) imagesSet.add(colorSquareUrl);
        if (primaryImageUrl) imagesSet.add(primaryImageUrl);
        if (row.BACK_MODEL_IMAGE) imagesSet.add(row.BACK_MODEL_IMAGE);
        if (row.SIDE_MODEL_IMAGE) imagesSet.add(row.SIDE_MODEL_IMAGE);

        const variant: SanMarCsvVariant = {
          style,
          colorName,
          colorCode: row.COLOR_CODE || row.PMS_CODE || undefined,
          productTitle: row.PRODUCT_TITLE || row.PRODUCT_NAME || undefined,
          description: row.PRODUCT_DESCRIPTION || row.DESCRIPTION || undefined,
          brand: row.BRAND_NAME || row.BRAND || undefined,
          category: row.CATEGORY_NAME || row.CATEGORY || undefined,
          subCategory: row.SUBCATEGORY_NAME || row.SUBCATEGORY || undefined,
          piecePrice,
          casePrice,
          salePrice,
          primaryImageUrl,
          colorSquareUrl,
          images: Array.from(imagesSet),
        };

        this.catalogMap.set(key, variant);

        const existingStyleList = this.styleIndexMap.get(style) || [];
        existingStyleList.push(variant);
        this.styleIndexMap.set(style, existingStyleList);
      }

      this.logger.log(`Loaded ${this.catalogMap.size} product variants across ${this.styleIndexMap.size} styles from SanMar CSV.`);
    } catch (err) {
      this.logger.error(`Error parsing SanMar CSV file: ${err?.message}`);
    }
  }

  /**
   * Instant lookup by style and color name
   */
  getVariant(style: string, colorName: string): SanMarCsvVariant | undefined {
    const key = `${style.trim().toUpperCase()}_${colorName.trim().toLowerCase()}`;
    return this.catalogMap.get(key);
  }

  /**
   * Instant lookup of all variants for a style
   */
  getStyleVariants(style: string): SanMarCsvVariant[] {
    return this.styleIndexMap.get(style.trim().toUpperCase()) || [];
  }
}
