import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateShopDto } from './dto/update-shop.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class ProfileShopService implements OnModuleInit {
  private readonly logger = new Logger(ProfileShopService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async onModuleInit() {
    const shopIdentifier = process.env.SHOP_NAME;
    if (!shopIdentifier) {
      this.logger.warn('SHOP_NAME environment variable is not defined.');
      return;
    }

    const exist = await this.prisma.shopInformation.findUnique({
      where: {
        shopIdentifier: shopIdentifier,
      },
    });

    if (!exist) {
      await this.prisma.shopInformation.create({
        data: {
          shopIdentifier: shopIdentifier,
          companyName: shopIdentifier,
        },
      });
      this.logger.log(
        `Automatically created shop information for: ${shopIdentifier}`,
      );
    } else {
      this.logger.log(`Shop information already exists for: ${shopIdentifier}`);
    }
  }

  async getActiveShop() {
    const shopIdentifier = process.env.SHOP_NAME;
    if (!shopIdentifier) {
      throw new NotFoundException(
        'SHOP_NAME environment variable is not defined',
      );
    }

    const result = await this.prisma.shopInformation.findUnique({
      where: {
        shopIdentifier: shopIdentifier,
      },
    });

    if (!result) {
      throw new NotFoundException('Shop information not found');
    }

    return result;
  }

  async updateActiveShop(
    updateShopDto: UpdateShopDto,
    file?: Express.Multer.File,
  ) {
    const shop = await this.getActiveShop();
    const { companyLogo: dtoCompanyLogo, ...rest } = updateShopDto;
    const updateData: any = { ...rest };

    if (file) {
      const uploadRes = await this.cloudinaryService.uploadFile(file, 'shops');
      updateData.companyLogo = uploadRes.secure_url;
    } else if (typeof dtoCompanyLogo === 'string') {
      updateData.companyLogo = dtoCompanyLogo;
    }

    return this.prisma.shopInformation.update({
      where: { shopId: shop.shopId },
      data: updateData,
    });
  }
}
