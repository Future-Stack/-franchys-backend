import { IsEnum, IsNotEmpty } from 'class-validator';
import { VendorStatus } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateVendorStatusDto {
  @ApiProperty({ enum: VendorStatus, description: 'The new status of the vendor' })
  @IsNotEmpty()
  @IsEnum(VendorStatus)
  status: VendorStatus;
}
