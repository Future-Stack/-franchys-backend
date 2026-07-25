import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { QuoteService } from './quote.service';
import { QuoteController } from './quote.controller';
import { JobModule } from '../job/job.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [JobModule, CloudinaryModule],
  controllers: [QuoteController],
  providers: [QuoteService],
  exports: [QuoteService],
})
export class QuoteModule {}
