import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Query,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { GetAdminsDto } from './dto/get-admins.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Users')
@Controller('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('admin')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({
    summary:
      'Create a new admin/employee with custom permissions (Super Admin only)',
  })
  createAdmin(@Body() createAdminDto: CreateAdminDto) {
    return this.usersService.createAdmin(createAdminDto);
  }

  @Get('admin')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get all admins with search and pagination (Super Admin only)',
  })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAllAdmins(@Query() query: GetAdminsDto) {
    return this.usersService.findAllAdmins(query);
  }

  @Get('admin/:id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get an admin/employee detail by ID (Super Admin only)',
  })
  findOneAdmin(@Param('id') id: string) {
    return this.usersService.findOneAdmin(id);
  }

  @Patch('admin/:id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Update an admin and their permissions (Super Admin only)',
  })
  updateAdmin(@Param('id') id: string, @Body() updateAdminDto: UpdateAdminDto) {
    return this.usersService.updateAdmin(id, updateAdminDto);
  }

  @Delete('admin/:id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Soft delete an admin (Super Admin only)' })
  softDeleteAdmin(@Param('id') id: string) {
    return this.usersService.softDeleteAdmin(id);
  }

  @Post('admin/:id/restore')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Restore a soft-deleted admin (Super Admin only)' })
  restoreAdmin(@Param('id') id: string) {
    return this.usersService.restoreAdmin(id);
  }

  @Post('admin/:id/ban')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Ban (suspend) an admin (Super Admin only)' })
  banAdmin(@Param('id') id: string) {
    return this.usersService.banAdmin(id);
  }
}
