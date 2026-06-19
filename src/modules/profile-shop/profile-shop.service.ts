import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateShopDto } from './dto/update-shop.dto';

@Injectable()
export class ProfileShopService implements OnModuleInit {
    constructor(private readonly prisma: PrismaService) { }

    async onModuleInit() {
        const shopIdentifier = process.env.SHOP_NAME;
        if (!shopIdentifier) {
            console.warn('[ProfileShopService] SHOP_NAME environment variable is not defined.');
            return;
        }

        const exist = await this.prisma.shopInformation.findUnique({
            where: {
                shopIdentifier: shopIdentifier
            }
        });

        if (!exist) {
            await this.prisma.shopInformation.create({
                data: {
                    shopIdentifier: shopIdentifier,
                    companyName: shopIdentifier
                }
            });
            console.log(`[ProfileShopService] Automatically created shop information for: ${shopIdentifier}`);
        } else {
            console.log(`[ProfileShopService] Shop information already exists for: ${shopIdentifier}`);
        }
    }

    async getActiveShop() {
        const shopIdentifier = process.env.SHOP_NAME;
        if (!shopIdentifier) {
            throw new NotFoundException("SHOP_NAME environment variable is not defined");
        }

        const result = await this.prisma.shopInformation.findUnique({
            where: {
                shopIdentifier: shopIdentifier
            }
        });

        if (!result) {
            throw new NotFoundException("Shop information not found");
        }

        return result;
    }

    async updateActiveShop(updateShopDto: UpdateShopDto) {
        const shop = await this.getActiveShop();
        return this.prisma.shopInformation.update({
            where: { shopId: shop.shopId },
            data: updateShopDto
        });
    }
}
