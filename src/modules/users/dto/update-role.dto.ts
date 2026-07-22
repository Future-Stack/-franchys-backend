import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { Role } from '@prisma/client';

export class UpdateRoleDto {
  @ApiProperty({
    enum: Role,
    enumName: 'Role',
    description: 'New role for the user (USER, ADMIN, SUPER_ADMIN)',
    example: Role.ADMIN,
  })
  @IsEnum(Role)
  @IsNotEmpty()
  role: Role;
}
