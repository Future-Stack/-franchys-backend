import { Injectable, Logger } from '@nestjs/common';
import { SanMarSoapService } from './sanmar-soap.service';
import { SanMarAutocompleteDto, SanMarProductSearchDto } from './dto/sanmar.dto';

@Injectable()
export class SanMarService {
  private readonly logger = new Logger(SanMarService.name);

  constructor(private readonly soapService: SanMarSoapService) {}

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
   * Generates standard SanMar CDN image URLs for product style & color swatches
   */
  private generateSanMarImageUrls(style: string, colorName?: string | null): string[] {
    const cleanStyle = style.trim().toUpperCase();
    const urls: string[] = [];

    // Model / Product Main Image
    urls.push(`https://img.sanmar.com/images/catalog/product/${cleanStyle}_front_flat.jpg`);
    urls.push(`https://img.sanmar.com/images/catalog/product/${cleanStyle}_model_front.jpg`);

    // Color Swatch Image
    if (colorName) {
      const cleanColor = colorName.trim().replace(/\s+/g, '').toLowerCase();
      urls.unshift(`https://img.sanmar.com/swatches/${cleanStyle}_${cleanColor}.jpg`);
    }

    return urls;
  }

  /**
   * Transforms SanMar's PromoStandards GetProduct SOAP response into rich product data
   */
  private formatToProductAutocomplete(raw: any, searchStyle: string) {
    if (!raw) return [];

    const product = raw.Product || raw.product || raw.ProductData || raw;

    const productName =
      product.ProductName ||
      product.productName ||
      `SanMar Style ${searchStyle}`;

    const style = product.productId || searchStyle;
    const itemNo = style;
    const brandName =
      product.productBrand ||
      product.Brand ||
      product.brand ||
      'SanMar';

    // Description / Material
    const descArray = this.toArray(product.description);
    const material = descArray.join(', ') || null;

    // Category
    const categoryObj =
      product.ProductCategoryArray?.ProductCategory ||
      product.productCategoryArray?.productCategory;
    const categoryName = categoryObj?.category || 'Apparel';

    // Parse parts (colors & sizes)
    const partArray = this.toArray(
      product.ProductPartArray?.ProductPart ||
        product.productPartArray?.productPart,
    );

    const availableSizesSet = new Set<string>();
    const colorMap = new Map<
      string,
      { name: string; pms: string | null; weight: number | null }
    >();

    for (const part of partArray) {
      // 1. Color
      const colorObj = part.ColorArray?.Color || part.colorArray?.color;
      const colorName = colorObj?.colorName || part.colorName || null;
      const pms = colorObj?.approximatePms || null;

      // 2. Size
      const sizeName =
        part.ApparelSize?.labelSize ||
        part.apparelSize?.labelSize ||
        null;

      if (sizeName) {
        availableSizesSet.add(sizeName);
      }

      // 3. Weight
      const weight = part.Dimension?.weight || null;

      if (colorName && !colorMap.has(colorName)) {
        colorMap.set(colorName, {
          name: colorName,
          pms: pms,
          weight: weight,
        });
      }
    }

    const availableSizes = Array.from(availableSizesSet);
    const results: any[] = [];

    if (colorMap.size > 0) {
      for (const [colorName, colorObj] of colorMap.entries()) {
        const labelParts = [
          productName,
          colorName,
          brandName,
          style,
          itemNo,
        ].filter(Boolean);

        const images = this.generateSanMarImageUrls(style, colorName);

        results.push({
          label: labelParts.join(' - '),
          productId: `sanmar-${style}`,
          productName: productName,
          itemNo: itemNo,
          style: style,
          price: 0, // Note: Net Wholesale Price is obtained via Pricing WSDL / SFTP CSV
          unitPrice: 0,
          brandId: null,
          brandName: brandName,
          categoryId: null,
          categoryName: categoryName,
          colorId: null,
          color: colorName,
          colorCode: colorObj.pms,
          availableSizes: availableSizes,
          material: material,
          images: images,
        });
      }
    } else {
      const labelParts = [productName, brandName, style, itemNo].filter(Boolean);
      const images = this.generateSanMarImageUrls(style, null);

      results.push({
        label: labelParts.join(' - '),
        productId: `sanmar-${style}`,
        productName: productName,
        itemNo: itemNo,
        style: style,
        price: 0,
        unitPrice: 0,
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

  async getRawProduct(styleNo: string) {
    return this.soapService.getProduct(styleNo);
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
