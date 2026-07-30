import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
} from 'class-validator';

export class SendPromotionalEmailDto {
  @ApiPropertyOptional({
    description:
      'Array of target Customer IDs to receive the email. If empty and sendToAll is true, sends to all non-deleted customers.',
    example: ['cust-uuid-1', 'cust-uuid-2'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  customerIds?: string[];

  @ApiPropertyOptional({
    description: 'Set to true to target all active customers in the database',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  sendToAll?: boolean;

  @ApiProperty({
    description: 'Email Subject line',
    example: 'Don\'t miss out — Spring Sale 20% Off Custom Patches!',
  })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiPropertyOptional({
    description: 'Title / Header text inside the email template',
    example: 'Spring Sale - 20% Off Custom Patches',
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({
    description:
      'Main message content formatted in plain text or HTML (from Rich Text Editor)',
    example:
      '<p>Enjoy <strong>20% off</strong> on all items this week! Use the promo code below at checkout.</p>',
  })
  @IsString()
  @IsNotEmpty()
  messageContent: string;

  @ApiPropertyOptional({
    description: 'Optional promotional discount code',
    example: 'SPRING20',
  })
  @IsString()
  @IsOptional()
  promoCode?: string;

  @ApiPropertyOptional({
    description: 'Optional CTA button link (e.g. store URL)',
    example: 'https://myshop.com/store',
  })
  @IsString()
  @IsOptional()
  ctaUrl?: string;

  @ApiPropertyOptional({
    description: 'Optional associated Campaign ID to update status to SENT',
    example: 'campaign-uuid-123',
  })
  @IsString()
  @IsOptional()
  campaignId?: string;
}
