import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import whatsappConfig from './config/whatsapp.config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { MailModule } from './modules/mail/mail.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ProfileShopModule } from './modules/profile-shop/profile-shop.module';
import { InvoiceModule } from './modules/invoice/invoice.module';
import { PriceMatricsModule } from './modules/price-matrics/price-matrics.module';
import { BrandModule } from './modules/brand/brand.module';
import { CustomerModule } from './modules/customer/customer.module';
import { ProductModule } from './modules/product/product.module';
import { VendorsModule } from './modules/vendors/vendors.module';
import { ScheduleModule } from '@nestjs/schedule';
import { EmailTrackerModule } from './modules/email-tracker/email-tracker.module';
import { CloudinaryModule } from './modules/cloudinary/cloudinary.module';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { QuoteModule } from './modules/quote/quote.module';
import { JobModule } from './modules/job/job.module';
import { CampaignModule } from './modules/campaign/campaign.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, whatsappConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
    AuthModule,
    UsersModule,
    MailModule,
    PrismaModule,
    ProfileShopModule,
    InvoiceModule,
    PriceMatricsModule,
    BrandModule,
    CustomerModule,
    ProductModule,
    VendorsModule,
    ScheduleModule.forRoot(),
    EmailTrackerModule,
    CloudinaryModule,
    WhatsAppModule,
    QuoteModule,
    JobModule,
    CampaignModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
