import { Injectable, Logger } from '@nestjs/common';
import { SanMarSoapService } from './sanmar-soap.service';
import { SanMarSftpService } from './sanmar-sftp.service';
import { SanMarAutocompleteDto, SanMarProductSearchDto } from './dto/sanmar.dto';

@Injectable()
export class SanMarService {
  private readonly logger = new Logger(SanMarService.name);

  constructor(
    private readonly soapService: SanMarSoapService,
    private readonly sftpService: SanMarSftpService,
  ) {}

  async autocomplete(dto: SanMarAutocompleteDto) {
    const search = dto.search?.trim();

    if (!search) {
      return [];
    }

    try {
      const raw = await this.soapService.getProduct(search);
      return this.formatToProductAutocomplete(raw, search);
    } catch (err) {
      this.logger.warn(`Live SanMar product fetch for "${search}" failed: ${err.message}`);
      throw err;
    }
  }

  private toArray<T = any>(val: any): T[] {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    return [val];
  }

  /**
   * Transforms SanMar's SOAP response and merges real prices & image URLs from SFTP
   */
  private formatToProductAutocomplete(raw: any, searchStyle: string) {
    if (!raw) return [];

    const product = raw.Product || raw.product || raw.ProductData || raw;

    const style = (product.productId || searchStyle).trim().toUpperCase();
    const itemNo = style;

    // Fetch matching SFTP CSV variants for this style
    const csvVariants = this.sftpService.getStyleVariants(style);

    const productName =
      csvVariants[0]?.productTitle ||
      product.ProductName ||
      product.productName ||
      `SanMar Style ${searchStyle}`;

    const brandName =
      csvVariants[0]?.brand ||
      product.productBrand ||
      product.Brand ||
      product.brand ||
      'SanMar';

    const categoryName =
      csvVariants[0]?.category ||
      product.ProductCategoryArray?.ProductCategory?.category ||
      'Apparel';

    const descArray = this.toArray(product.description);
    const material = csvVariants[0]?.description || descArray.join(', ') || null;

    // Parse SOAP product parts
    const partArray = this.toArray(
      product.ProductPartArray?.ProductPart ||
        product.productPartArray?.productPart,
    );

    const availableSizesSet = new Set<string>();
    const colorMap = new Map<
      string,
      { name: string; pms: string | null }
    >();

    for (const part of partArray) {
      const colorObj = part.ColorArray?.Color || part.colorArray?.color;
      const colorName = colorObj?.colorName || part.colorName || null;
      const pms = colorObj?.approximatePms || null;

      const sizeName =
        part.ApparelSize?.labelSize ||
        part.apparelSize?.labelSize ||
        null;

      if (sizeName) availableSizesSet.add(sizeName);

      if (colorName && !colorMap.has(colorName)) {
        colorMap.set(colorName, {
          name: colorName,
          pms: pms,
        });
      }
    }

    const availableSizes = Array.from(availableSizesSet);
    const results: any[] = [];

    // If SOAP returned color variants, merge each with SFTP CSV data
    if (colorMap.size > 0) {
      for (const [colorName, colorObj] of colorMap.entries()) {
        const csvMatch = this.sftpService.getVariant(style, colorName);

        const price = csvMatch?.piecePrice || 0;
        const casePrice = csvMatch?.casePrice || price;
        const images = csvMatch?.images && csvMatch.images.length > 0 ? csvMatch.images : [];

        const labelParts = [
          productName,
          colorName,
          brandName,
          style,
          itemNo,
        ].filter(Boolean);

        results.push({
          label: labelParts.join(' - '),
          productId: `sanmar-${style}`,
          productName: productName,
          itemNo: itemNo,
          style: style,
          price: price,
          unitPrice: price,
          casePrice: casePrice,
          brandId: null,
          brandName: brandName,
          categoryId: null,
          categoryName: categoryName,
          colorId: null,
          color: colorName,
          colorCode: colorObj.pms || csvMatch?.colorCode || null,
          availableSizes: availableSizes,
          material: material,
          images: images,
        });
      }
    } else {
      const price = csvVariants[0]?.piecePrice || 0;
      const images = csvVariants[0]?.images || [];
      const labelParts = [productName, brandName, style, itemNo].filter(Boolean);

      results.push({
        label: labelParts.join(' - '),
        productId: `sanmar-${style}`,
        productName: productName,
        itemNo: itemNo,
        style: style,
        price: price,
        unitPrice: price,
        casePrice: price,
        brandId: null,
        brandName: brandName,
        categoryId: null,
        categoryName: categoryName,
        colorId: null,
        color: null,
        colorCode: null,
        availableSizes: availableSizes,
        material: material,
        images: images,
      });
    }

    return results;
  }

  async syncSftpCatalog() {
    return this.sftpService.syncSftpCatalog();
  }

  async getRawProduct(styleNo: string) {
    const soapData = await this.soapService.getProduct(styleNo);
    const sftpVariants = this.sftpService.getStyleVariants(styleNo);
    return { soapData, sftpVariants };
  }

  async getProduct(styleNo: string) {
    const raw = await this.soapService.getProduct(styleNo);
    return this.formatToProductAutocomplete(raw, styleNo);
  }

  async searchProducts(dto: SanMarProductSearchDto) {
    const style = dto.search || '8000';
    const data = await this.autocomplete({ search: style });
    return {
      data,
      meta: {
        total: data.length,
        page: dto.page || 1,
        limit: dto.limit || 20,
        totalPages: 1,
      },
    };
  }

  async getInventory(styleNo: string, color?: string, size?: string) {
    return this.soapService.getInventoryLevels(styleNo, color, size);
  }
}
