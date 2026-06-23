import { Controller, Post, Get, Body, Param, Req, Res, HttpStatus } from '@nestjs/common';
import { EmailTrackerService } from './email-tracker.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('emails')
export class EmailTrackerController {
  constructor(private readonly emailTrackerService: EmailTrackerService) {}

  @Public()
  @Post('webhook')
  async handleWebhook(@Body() body: any, @Res() res: any) {
    // Acknowledge quickly per Google Pub/Sub requirements
    res.status(HttpStatus.OK).send('OK');
    
    // Process asynchronously so we don't hold up the webhook response
    try {
      await this.emailTrackerService.handleWebhook(body);
    } catch (err) {
      console.error('Failed to process webhook asynchronously', err);
    }
  }

  @Get('test-watch')
  async triggerWatchForTesting() {
    await this.emailTrackerService.startGmailWatch();
    return { success: true, message: 'Gmail watch triggered for testing' };
  }

  @Get('threads')
  async getThreads() {
    return this.emailTrackerService.getThreads();
  }

  @Get('threads/:id/messages')
  async getThreadMessages(@Param('id') threadId: string) {
    return this.emailTrackerService.getThreadMessages(threadId);
  }

  @Post('threads/:id/reply')
  async replyToThread(@Param('id') threadId: string, @Body('text') replyText: string) {
    await this.emailTrackerService.sendFollowUpEmail(threadId, replyText);
    return { success: true, message: 'Reply sent successfully' };
  }
}
