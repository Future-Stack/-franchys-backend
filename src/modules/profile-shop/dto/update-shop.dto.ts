import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEmail } from 'class-validator';

export class UpdateShopDto {
  @ApiPropertyOptional({ description: 'The name of the company' })
  @IsString()
  @IsOptional()
  companyName?: string;

  @ApiPropertyOptional({ description: 'The email address of the company' })
  @IsEmail()
  @IsOptional()
  companyEmail?: string;

  @ApiPropertyOptional({ description: 'The address of the shop' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'The city where the shop is located' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ description: 'The state where the shop is located' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({ description: 'The zip/postal code' })
  @IsString()
  @IsOptional()
  zip?: string;

  @ApiPropertyOptional({ description: 'The country where the shop is located' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ description: 'The contact phone number' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'The company website url path' })
  @IsString()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({ description: 'The Facebook page URL' })
  @IsString()
  @IsOptional()
  facebook?: string;

  @ApiPropertyOptional({ description: 'The WhatsApp contact or link' })
  @IsString()
  @IsOptional()
  whatsapp?: string;

  @ApiPropertyOptional({ description: 'The TikTok profile link' })
  @IsString()
  @IsOptional()
  tiktok?: string;

  @ApiPropertyOptional({ description: 'The Instagram profile link' })
  @IsString()
  @IsOptional()
  instagram?: string;
}
