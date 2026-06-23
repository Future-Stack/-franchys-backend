import { Module } from '@nestjs/common';
import { EmailTrackerController } from './email-tracker.controller';
import { EmailTrackerService } from './email-tracker.service';

@Module({
  controllers: [EmailTrackerController],
  providers: [EmailTrackerService],
  exports: [EmailTrackerService],
})
export class EmailTrackerModule { }
