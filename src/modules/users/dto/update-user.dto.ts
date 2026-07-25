import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEmail } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'User full name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'User email' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'User password' })
  @IsString()
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({ description: 'Contact phone number' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'Address' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'Country' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ description: 'Preferred language' })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiPropertyOptional({ description: 'Timezone' })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Profile image file to upload to Cloudinary',
  })
  @IsOptional()
  profileImage?: any;
}
