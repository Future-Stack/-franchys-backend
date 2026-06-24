import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class ReplyDto {
  @ApiProperty({
    description: 'The text content of the reply to send to the thread',
    example: 'Thank you for reaching out! We will get back to you shortly.'
  })
  @IsString()
  @IsNotEmpty()
  text: string;
}
