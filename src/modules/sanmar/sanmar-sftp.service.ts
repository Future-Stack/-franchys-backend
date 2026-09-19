import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { parse } from 'csv-parse';

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
  private readonly localZipFile = path.join(this.localDataDir, 'SanMar_EPDD_csv.zip');

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
      this.logger.log(`Found existing SanMar CSV file at ${this.localCsvFile}. Loading catalog into memory…`);
      await this.parseCsvFile(this.localCsvFile);
    } else {
      this.logger.log('No local SanMar CSV file found yet. Call POST /api/v1/sanmar/sync-sftp to download.');
    }
  }

  /**
   * Downloads SanMar_EPDD_csv.zip (or .csv) from ftp.sanmar.com:2200/SanMarPDD/
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

      // 1. Prefer downloading the 15MB compressed zip (35x faster and avoids socket drops)
      const remoteZip = '/SanMarPDD/SanMar_EPDD_csv.zip';
      const remoteCsv = '/SanMarPDD/SanMar_EPDD.csv';

      try {
        this.logger.log(`Downloading ${remoteZip} (compressed ~15MB) -> ${this.localZipFile}…`);
        await sftp.fastGet(remoteZip, this.localZipFile);
        await sftp.end();

        this.logger.log(`Extracting ${this.localZipFile}…`);
        execSync(`unzip -o "${this.localZipFile}" -d "${this.localDataDir}"`);
        if (fs.existsSync(this.localZipFile)) {
          fs.unlinkSync(this.localZipFile);
        }
      } catch (zipErr) {
        this.logger.warn(`Zip download failed (${zipErr?.message}), falling back to direct CSV download…`);
        await sftp.fastGet(remoteCsv, this.localCsvFile);
        await sftp.end();
      }

      this.logger.log('SFTP download & extract completed successfully! Parsing CSV data…');
      await this.parseCsvFile(this.localCsvFile);

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
   * Streams and parses the SanMar_EPDD.csv file and populates in-memory lookup maps
   */
  public async parseCsvFile(filePath: string): Promise<void> {
    try {
      const fileStream = fs.createReadStream(filePath);
      const parser = fileStream.pipe(
        parse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
          relax_column_count: true,
        }),
      );

      const newCatalogMap = new Map<string, SanMarCsvVariant>();
      const newStyleIndexMap = new Map<string, SanMarCsvVariant[]>();

      for await (const row of parser) {
        const style = (
          row['STYLE#'] ||
          row.STYLE_NUM ||
          row.STYLE ||
          row.PRODUCT_STYLE ||
          ''
        )
          .trim()
          .toUpperCase();
        const colorName = (row.COLOR_NAME || row.COLOR || '').trim();

        if (!style || !colorName) continue;

        const key = `${style}_${colorName.toLowerCase()}`;

        const piecePrice =
          parseFloat(row.PIECE_PRICE || row.PIECE_PRICE_NET || row.PRICE || '0') || 0;
        const casePrice =
          parseFloat(row.CASE_PRICE || row.CASE_PRICE_NET || '0') || piecePrice;
        const salePrice =
          parseFloat(row.SALE_PRICE || row.SUGGESTED_PRICE || '0') || undefined;

        let primaryImageUrl =
          row.FRONT_MODEL_IMAGE_URL ||
          row.PRIMARY_IMAGE_URL ||
          row.HIGH_RES_FRONT_IMAGE ||
          row.FRONT_MODEL_IMAGE ||
          undefined;
        if (primaryImageUrl && !primaryImageUrl.startsWith('http')) {
          primaryImageUrl = `https://cdnm.sanmar.com/imglib/mresjpg/${primaryImageUrl}`;
        }

        const colorSquareUrl = row.COLOR_SQUARE_IMAGE || row.COLOR_SWATCH_IMAGE || undefined;

        const imagesSet = new Set<string>();
        if (primaryImageUrl) imagesSet.add(primaryImageUrl);

        const checkImage = (img?: string) => {
          if (!img) return;
          if (img.startsWith('http')) {
            imagesSet.add(img);
          } else {
            imagesSet.add(`https://cdnm.sanmar.com/imglib/mresjpg/${img}`);
          }
        };

        checkImage(row.COLOR_PRODUCT_IMAGE);
        checkImage(row.FRONT_FLAT_IMAGE);
        checkImage(row.BACK_MODEL_IMAGE);
        checkImage(row.BACK_FLAT_IMAGE);

        const variant: SanMarCsvVariant = {
          style,
          colorName,
          colorCode: row.PMS_COLOR || row.COLOR_CODE || row.PMS_CODE || undefined,
          productTitle: row.PRODUCT_TITLE || row.PRODUCT_NAME || undefined,
          description: row.PRODUCT_DESCRIPTION || row.DESCRIPTION || undefined,
          brand: row.MILL || row.BRAND_NAME || row.BRAND || undefined,
          category: row.CATEGORY_NAME || row.CATEGORY || undefined,
          subCategory: row.SUBCATEGORY_NAME || row.SUBCATEGORY || undefined,
          piecePrice,
          casePrice,
          salePrice,
          primaryImageUrl,
          colorSquareUrl,
          images: Array.from(imagesSet),
        };

        newCatalogMap.set(key, variant);

        const existingStyleList = newStyleIndexMap.get(style) || [];
        existingStyleList.push(variant);
        newStyleIndexMap.set(style, existingStyleList);
      }

      this.catalogMap = newCatalogMap;
      this.styleIndexMap = newStyleIndexMap;

      this.logger.log(
        `Loaded ${this.catalogMap.size} product variants across ${this.styleIndexMap.size} styles from SanMar CSV.`,
      );
    } catch (err) {
      this.logger.error(`Error parsing SanMar CSV file: ${err?.message}`);
    }
  }

  /**
   * Instant lookup by style and color name with fuzzy matching and style-level fallback
   */
  getVariant(style: string, colorName: string): SanMarCsvVariant | undefined {
    const cleanStyle = style.trim().toUpperCase();
    const cleanColor = (colorName || '').trim().toLowerCase();
    const key = `${cleanStyle}_${cleanColor}`;

    // 1. Direct match
    const direct = this.catalogMap.get(key);
    if (direct) return direct;

    const styleVariants = this.styleIndexMap.get(cleanStyle);
    if (!styleVariants || styleVariants.length === 0) return undefined;

    // 2. Normalized alphanumeric match (e.g. "Sport Grey" vs "sportgrey", "ScarRed" vs "Scarlet Red")
    const normSearch = cleanColor.replace(/[^a-z0-9]/g, '');
    if (normSearch) {
      const match = styleVariants.find((v) => {
        const normV = v.colorName.toLowerCase().replace(/[^a-z0-9]/g, '');
        return normV === normSearch || normV.includes(normSearch) || normSearch.includes(normV);
      });
      if (match) return match;
    }

    // 3. Fallback to the first variant of this style so price & images are never 0/empty
    return styleVariants[0];
  }

  /**
   * Instant lookup of all variants for a style
   */
  getStyleVariants(style: string): SanMarCsvVariant[] {
    return this.styleIndexMap.get(style.trim().toUpperCase()) || [];
  }
}
