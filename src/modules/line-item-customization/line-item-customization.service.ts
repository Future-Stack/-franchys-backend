import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateLineItemCustomizationDto } from './dto/line-item-customization.dto';

const DEFAULT_CUSTOMIZATION = {
  id: 'default',
  showQuantity: true,
  showItemNumber: false,
  showCategory: false,
  showDescription: true,
  showColor: false,
  showMarkup: false,
  showPrice: true,

  sizeAdultXS: false,
  sizeAdultS: true,
  sizeAdultM: true,
  sizeAdultL: true,
  sizeAdultXL: true,
  sizeAdult2XL: false,
  sizeAdult3XL: false,
  sizeAdult4XL: false,

  sizeYouthXS: false,
  sizeYouthS: false,
  sizeYouthM: false,
  sizeYouthL: false,
  sizeYouthXL: false,

  sizeToddler2T: false,
  sizeToddler3T: false,
  sizeToddler4T: false,
  sizeToddler5T: false,
  sizeToddler6T: false,

  sizeBabyNewborn: false,
  sizeBaby3Months: false,
  sizeBaby6Months: false,
  sizeBaby9Months: false,
  sizeBaby12Months: false,
  sizeBaby18Months: false,
  sizeBaby24Months: false,
};

@Injectable()
export class LineItemCustomizationService implements OnModuleInit {
  private readonly logger = new Logger(LineItemCustomizationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      await this.getCustomization();
    } catch (e: any) {
      this.logger.warn(
        `Could not initialize line item customization table: ${e.message}`,
      );
    }
  }

  async getCustomization() {
    try {
      let current = await this.prisma.lineItemCustomization.findFirst();
      if (!current) {
        current = await this.prisma.lineItemCustomization.create({
          data: {
            showQuantity: true,
            showItemNumber: false,
            showCategory: false,
            showDescription: true,
            showColor: false,
            showMarkup: false,
            showPrice: true,

            sizeAdultXS: false,
            sizeAdultS: true,
            sizeAdultM: true,
            sizeAdultL: true,
            sizeAdultXL: true,
            sizeAdult2XL: false,
            sizeAdult3XL: false,
            sizeAdult4XL: false,

            sizeYouthXS: false,
            sizeYouthS: false,
            sizeYouthM: false,
            sizeYouthL: false,
            sizeYouthXL: false,

            sizeToddler2T: false,
            sizeToddler3T: false,
            sizeToddler4T: false,
            sizeToddler5T: false,
            sizeToddler6T: false,

            sizeBabyNewborn: false,
            sizeBaby3Months: false,
            sizeBaby6Months: false,
            sizeBaby9Months: false,
            sizeBaby12Months: false,
            sizeBaby18Months: false,
            sizeBaby24Months: false,
          },
        });
      }
      return current;
    } catch (e: any) {
      this.logger.warn(
        `Database query failed for LineItemCustomization: ${e.message}`,
      );
      return DEFAULT_CUSTOMIZATION as any;
    }
  }

  async updateCustomization(dto: UpdateLineItemCustomizationDto) {
    const current = await this.getCustomization();
    if (current.id === 'default') {
      return { ...DEFAULT_CUSTOMIZATION, ...dto };
    }
    return this.prisma.lineItemCustomization.update({
      where: { id: current.id },
      data: dto,
    });
  }

  async getStructuredCustomization() {
    const c = await this.getCustomization();

    return {
      columns: {
        quantity: c.showQuantity,
        itemNumber: c.showItemNumber,
        category: c.showCategory,
        description: c.showDescription,
        color: c.showColor,
        markup: c.showMarkup,
        price: c.showPrice,
      },
      sizingOptions: {
        adultSizes: [
          { key: 'sizeAdultXS', size: 'XS', selected: c.sizeAdultXS },
          { key: 'sizeAdultS', size: 'S', selected: c.sizeAdultS },
          { key: 'sizeAdultM', size: 'M', selected: c.sizeAdultM },
          { key: 'sizeAdultL', size: 'L', selected: c.sizeAdultL },
          { key: 'sizeAdultXL', size: 'XL', selected: c.sizeAdultXL },
          { key: 'sizeAdult2XL', size: '2XL', selected: c.sizeAdult2XL },
          { key: 'sizeAdult3XL', size: '3XL', selected: c.sizeAdult3XL },
          { key: 'sizeAdult4XL', size: '4XL', selected: c.sizeAdult4XL },
        ],
        youthSizes: [
          { key: 'sizeYouthXS', size: 'Youth XS', selected: c.sizeYouthXS },
          { key: 'sizeYouthS', size: 'Youth S', selected: c.sizeYouthS },
          { key: 'sizeYouthM', size: 'Youth M', selected: c.sizeYouthM },
          { key: 'sizeYouthL', size: 'Youth L', selected: c.sizeYouthL },
          { key: 'sizeYouthXL', size: 'Youth XL', selected: c.sizeYouthXL },
        ],
        toddlerSizes: [
          { key: 'sizeToddler2T', size: '2T', selected: c.sizeToddler2T },
          { key: 'sizeToddler3T', size: '3T', selected: c.sizeToddler3T },
          { key: 'sizeToddler4T', size: '4T', selected: c.sizeToddler4T },
          { key: 'sizeToddler5T', size: '5T', selected: c.sizeToddler5T },
          { key: 'sizeToddler6T', size: '6T', selected: c.sizeToddler6T },
        ],
        babyInfantSizes: [
          {
            key: 'sizeBabyNewborn',
            size: 'Newborn',
            selected: c.sizeBabyNewborn,
          },
          {
            key: 'sizeBaby3Months',
            size: '3 Months',
            selected: c.sizeBaby3Months,
          },
          {
            key: 'sizeBaby6Months',
            size: '6 Months',
            selected: c.sizeBaby6Months,
          },
          {
            key: 'sizeBaby9Months',
            size: '9 Months',
            selected: c.sizeBaby9Months,
          },
          {
            key: 'sizeBaby12Months',
            size: '12 Months',
            selected: c.sizeBaby12Months,
          },
          {
            key: 'sizeBaby18Months',
            size: '18 Months',
            selected: c.sizeBaby18Months,
          },
          {
            key: 'sizeBaby24Months',
            size: '24 Months',
            selected: c.sizeBaby24Months,
          },
        ],
      },
    };
  }

  async getSelectedSizesArray(): Promise<string[]> {
    const c = await this.getCustomization();
    const sizes: string[] = [];

    // Adult Sizes
    if (c.sizeAdultXS) sizes.push('XS');
    if (c.sizeAdultS) sizes.push('S');
    if (c.sizeAdultM) sizes.push('M');
    if (c.sizeAdultL) sizes.push('L');
    if (c.sizeAdultXL) sizes.push('XL');
    if (c.sizeAdult2XL) sizes.push('2XL');
    if (c.sizeAdult3XL) sizes.push('3XL');
    if (c.sizeAdult4XL) sizes.push('4XL');

    // Youth Sizes
    if (c.sizeYouthXS) sizes.push('Youth XS');
    if (c.sizeYouthS) sizes.push('Youth S');
    if (c.sizeYouthM) sizes.push('Youth M');
    if (c.sizeYouthL) sizes.push('Youth L');
    if (c.sizeYouthXL) sizes.push('Youth XL');

    // Toddler Sizes
    if (c.sizeToddler2T) sizes.push('2T');
    if (c.sizeToddler3T) sizes.push('3T');
    if (c.sizeToddler4T) sizes.push('4T');
    if (c.sizeToddler5T) sizes.push('5T');
    if (c.sizeToddler6T) sizes.push('6T');

    // Baby / Infant Sizes
    if (c.sizeBabyNewborn) sizes.push('Newborn');
    if (c.sizeBaby3Months) sizes.push('3 Months');
    if (c.sizeBaby6Months) sizes.push('6 Months');
    if (c.sizeBaby9Months) sizes.push('9 Months');
    if (c.sizeBaby12Months) sizes.push('12 Months');
    if (c.sizeBaby18Months) sizes.push('18 Months');
    if (c.sizeBaby24Months) sizes.push('24 Months');

    return sizes;
  }
}
