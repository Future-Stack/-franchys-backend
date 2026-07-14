import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { GetAdminsDto } from './dto/get-admins.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { Role, Status, Prisma } from '@prisma/client';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) { }

  async create(createUserDto: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    return this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
      },
    });
  }

  async createAdmin(createAdminDto: CreateAdminDto) {
    const { permissions, ...userData } = createAdminDto;

    const hashedPassword = await bcrypt.hash(userData.password, 10);

    return this.prisma.$transaction(async (prisma) => {
      // Create the user
      const user = await prisma.user.create({
        data: {
          ...userData,
          password: hashedPassword,
          role: Role.ADMIN,
        },
      });

      // Create the permissions
      const userPermission = await prisma.userPermission.create({
        data: {
          userId: user.userId,
          ...permissions,
        },
      });

      // Remove password before returning
      const result = { ...user };
      delete (result as any).password;
      return { ...result, permissions: userPermission };
    });
  }

  async findAllAdmins(query: GetAdminsDto) {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      role: Role.ADMIN,
      isDeleted: false,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: { userPermissions: true },
        orderBy: { createAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    // Remove passwords from response
    const sanitizedData = data.map((user) => {
      const u = { ...user };
      delete (u as any).password;
      return u;
    });

    return {
      data: sanitizedData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateAdmin(userId: string, updateAdminDto: UpdateAdminDto) {
    const { permissions, ...userData } = updateAdminDto;

    const admin = await this.prisma.user.findFirst({
      where: { userId, role: Role.ADMIN, isDeleted: false },
    });

    if (!admin) throw new NotFoundException('Admin not found or deleted');

    const updateData: any = { ...userData };
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    return this.prisma.$transaction(async (prisma) => {
      // Update User
      const updatedUser = await prisma.user.update({
        where: { userId },
        data: updateData,
      });

      // Update Permissions if provided
      let updatedPermissions: any = null;
      if (permissions) {
        updatedPermissions = await prisma.userPermission.upsert({
          where: { userId },
          create: { userId, ...permissions },
          update: permissions,
        });
      }

      const result = { ...updatedUser };
      delete (result as any).password;
      return { ...result, permissions: updatedPermissions };
    });
  }

  async softDeleteAdmin(userId: string) {
    const admin = await this.prisma.user.findFirst({
      where: { userId, role: Role.ADMIN },
    });
    if (!admin) throw new NotFoundException('Admin not found');

    return this.prisma.user.update({
      where: { userId },
      data: { isDeleted: true },
      select: { userId: true, name: true, email: true, isDeleted: true },
    });
  }

  async restoreAdmin(userId: string) {
    const admin = await this.prisma.user.findFirst({
      where: { userId, role: Role.ADMIN },
    });
    if (!admin) throw new NotFoundException('Admin not found');

    return this.prisma.user.update({
      where: { userId },
      data: { isDeleted: false },
      select: { userId: true, name: true, email: true, isDeleted: true },
    });
  }

  async banAdmin(userId: string) {
    const admin = await this.prisma.user.findFirst({
      where: { userId, role: Role.ADMIN, isDeleted: false },
    });
    if (!admin) throw new NotFoundException('Admin not found or deleted');

    return this.prisma.user.update({
      where: { userId },
      data: { status: Status.SUSPEND },
      select: { userId: true, name: true, email: true, status: true },
    });
  }

  async findAll() {
    const result = await this.prisma.user.findMany({
    });
    return result;
  }

  async findOne(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { userId }
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async update(userId: string, updateUserDto: UpdateUserDto) {
    const data: any = { ...updateUserDto };
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    return this.prisma.user.update({
      where: { userId },
      data,
    });
  }

  remove(userId: string) {
    return this.prisma.user.delete({
      where: { userId },
    });
  }

  async verifyPassword(password: string, hash: string) {
    return bcrypt.compare(password, hash);
  }
}
