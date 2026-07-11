import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReplyDto {
  @ApiProperty({
    example: 'Hello! Your order is ready.',
    description: 'Message text to send',
  })
  @IsString()
  @IsNotEmpty()
  text: string;
}

export class SendMessageDto {
  @ApiProperty({
    example: '+8801711123456',
    description: 'Recipient phone number in E.164 format',
  })
  @IsString()
  @IsNotEmpty()
  to: string;

  @ApiProperty({
    example: 'Your invoice is attached.',
    description: 'Message text to send',
  })
  @IsString()
  @IsNotEmpty()
  text: string;
}

export class SendTemplateMessageDto {
  @ApiProperty({
    example: '+8801711123456',
    description: 'Recipient phone number in E.164 format',
  })
  @IsString()
  @IsNotEmpty()
  to: string;

  @ApiProperty({
    example: 'hello_world',
    description: 'Approved WhatsApp message template name',
  })
  @IsString()
  @IsNotEmpty()
  templateName: string;

  @ApiProperty({ example: 'en_US', description: 'Template language code' })
  @IsString()
  @IsNotEmpty()
  languageCode: string;
}
