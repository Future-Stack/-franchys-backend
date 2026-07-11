import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { EmailTrackerService } from './email-tracker.service';
import { Public } from '../../common/decorators/public.decorator';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { ReplyDto } from './dto/email-tracker.dto';

@ApiTags('Email Tracker')
@Controller('emails')
@ApiBearerAuth()
export class EmailTrackerController {
  constructor(private readonly emailTrackerService: EmailTrackerService) {}

  @Public()
  @Post('webhook')
  @ApiOperation({
    summary: 'Webhook to receive Gmail notifications',
    description:
      'Used by Google Cloud Pub/Sub to notify the app of new emails (Internal Use).',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook acknowledged successfully.',
  })
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
  @ApiOperation({
    summary: 'Trigger Gmail Watch',
    description:
      'Manually triggers the Gmail watch subscription to start receiving notifications.',
  })
  @ApiResponse({
    status: 200,
    description: 'Gmail watch triggered successfully.',
  })
  async triggerWatchForTesting() {
    await this.emailTrackerService.startGmailWatch();
    return { success: true, message: 'Gmail watch triggered for testing' };
  }

  @Get('threads')
  @ApiOperation({
    summary: 'Get all email threads',
    description:
      'Retrieves a list of all email threads ordered by latest activity.',
  })
  @ApiResponse({ status: 200, description: 'Threads retrieved successfully.' })
  async getThreads() {
    return this.emailTrackerService.getThreads();
  }

  @Get('threads/:id/messages')
  @ApiOperation({
    summary: 'Get messages for a thread',
    description: 'Retrieves all messages belonging to a specific thread ID.',
  })
  @ApiParam({ name: 'id', description: 'The unique ID of the thread' })
  @ApiResponse({ status: 200, description: 'Messages retrieved successfully.' })
  async getThreadMessages(@Param('id') threadId: string) {
    return this.emailTrackerService.getThreadMessages(threadId);
  }

  @Post('threads/:id/reply')
  @ApiOperation({
    summary: 'Reply to an email thread',
    description: 'Sends a direct email reply to the specified thread ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'The unique ID of the thread to reply to',
  })
  @ApiBody({ type: ReplyDto })
  @ApiResponse({ status: 201, description: 'Reply sent successfully.' })
  async replyToThread(
    @Param('id') threadId: string,
    @Body() replyDto: ReplyDto,
  ) {
    await this.emailTrackerService.sendFollowUpEmail(threadId, replyDto.text);
    return { success: true, message: 'Reply sent successfully' };
  }
}
