import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AdminPermissionsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canCreateCustomers?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canUpdateCustomers?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canDeleteCustomers?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() canCreateQuotes?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() canUpdateQuotes?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() canDeleteQuotes?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() canApproveQuotes?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() canCreateJobs?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() canUpdateJobs?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() canDeleteJobs?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() canCreateProducts?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() canUpdateProducts?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() canDeleteProducts?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() canCreateUsers?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() canUpdateUsers?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() canDeleteUsers?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() canCreateInvoices?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() canUpdateInvoices?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() canDeleteInvoices?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canApproveInvoices?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() canTakePayment?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canCreateInvoiceFees?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canUpdateInvoiceFees?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canDeleteInvoiceFees?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canChangeInvoiceInformation?: boolean;
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  canChangeShopInformation?: boolean;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() canCreateVendor?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() canUpdateVendor?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() canDeleteVendor?: boolean;
}

export class CreateAdminDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @ApiPropertyOptional({ type: AdminPermissionsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AdminPermissionsDto)
  permissions?: AdminPermissionsDto;
}
