import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EmailTrackerService } from './email-tracker.service';

@Processor('email-sync')
export class EmailSyncProcessor extends WorkerHost {
  constructor(private readonly emailTrackerService: EmailTrackerService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    if (job.name === 'sync-emails-job') {
      await this.emailTrackerService.syncEmails();
    } else if (job.name === 'renew-watch-job') {
      await this.emailTrackerService.startGmailWatch();
    }
  }
}
