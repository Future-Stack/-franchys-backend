import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { Role, Status } from '@prisma/client';

export class CreateUserDto {
  @IsOptional()
  otp?: number;

  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @IsString()
  @IsOptional()
  operationsRole?: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsBoolean()
  @IsOptional()
  googleAuth?: boolean;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEnum(Status)
  @IsOptional()
  status?: Status;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  country?: string;
}
