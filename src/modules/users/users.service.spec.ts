import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Role, Status } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const mockPrisma = {
  user: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  userPermission: {
    create: jest.fn(),
    upsert: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('UsersService (unit)', () => {
  let service: UsersService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('create', () => {
    it('should create a user with a hashed password', async () => {
      const dto = {
        name: 'User',
        email: 'u@test.com',
        password: 'password123',
      };
      mockPrisma.user.create.mockImplementation(
        (args: { data: { password: string } }) => {
          return Promise.resolve({
            userId: 'u-1',
            ...dto,
            password: args.data.password,
          });
        },
      );

      const result = await service.create(dto);

      expect(mockPrisma.user.create).toHaveBeenCalled();
      const isMatch = await bcrypt.compare(dto.password, result.password);
      expect(isMatch).toBe(true);
    });
  });

  describe('createAdmin', () => {
    it('should run transaction to create user and permissions', async () => {
      const dto = {
        name: 'Admin User',
        email: 'admin.u@test.com',
        password: 'password123',
        permissions: { canApproveQuotes: true },
      };

      // Mock transaction wrapper execution
      mockPrisma.$transaction.mockImplementation(
        async (callback: (tx: typeof mockPrisma) => Promise<unknown>) => {
          return await callback(mockPrisma);
        },
      );

      mockPrisma.user.create.mockResolvedValue({
        userId: 'admin-1',
        name: dto.name,
        email: dto.email,
        role: Role.ADMIN,
      });
      mockPrisma.userPermission.create.mockResolvedValue({
        id: 'perm-1',
        userId: 'admin-1',
        canApproveQuotes: true,
      });

      const result = await service.createAdmin(dto);

      expect(mockPrisma.user.create).toHaveBeenCalled();
      expect(mockPrisma.userPermission.create).toHaveBeenCalled();
      expect(result.permissions).toEqual({
        id: 'perm-1',
        userId: 'admin-1',
        canApproveQuotes: true,
      });
    });
  });

  describe('findAllAdmins', () => {
    it('should return paginated and sanitized admins list', async () => {
      const mockAdmins = [
        { userId: '1', role: Role.ADMIN, password: 'hashed-password' },
      ];
      mockPrisma.user.findMany.mockResolvedValue(mockAdmins);
      mockPrisma.user.count.mockResolvedValue(1);

      const result = await service.findAllAdmins({ page: 1, limit: 10 });

      expect(result.data[0]).not.toHaveProperty('password');
      expect(result.meta.total).toBe(1);
    });
  });

  describe('updateAdmin', () => {
    const dto = { name: 'Admin Mod', permissions: { canApproveQuotes: false } };

    it('should run transaction to update admin details and permissions', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        userId: 'admin-1',
        role: Role.ADMIN,
        isDeleted: false,
      });
      mockPrisma.$transaction.mockImplementation(
        async (callback: (tx: typeof mockPrisma) => Promise<unknown>) => {
          return await callback(mockPrisma);
        },
      );
      mockPrisma.user.update.mockResolvedValue({
        userId: 'admin-1',
        name: dto.name,
      });
      mockPrisma.userPermission.upsert.mockResolvedValue({
        userId: 'admin-1',
        canApproveQuotes: false,
      });

      const result = await service.updateAdmin('admin-1', dto);

      expect(mockPrisma.user.update).toHaveBeenCalled();
      expect(mockPrisma.userPermission.upsert).toHaveBeenCalled();
      expect(result.permissions).toBeDefined();
    });

    it('should throw NotFoundException if admin not found or isDeleted', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(service.updateAdmin('bad-id', dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('softDeleteAdmin', () => {
    it('should mark admin as deleted', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        userId: 'admin-1',
        role: Role.ADMIN,
      });
      mockPrisma.user.update.mockResolvedValue({
        userId: 'admin-1',
        isDeleted: true,
      });

      const result = await service.softDeleteAdmin('admin-1');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { userId: 'admin-1' },
        data: { isDeleted: true },
        select: { userId: true, name: true, email: true, isDeleted: true },
      });
      expect(result.isDeleted).toBe(true);
    });
  });

  describe('restoreAdmin', () => {
    it('should restore soft-deleted admin', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        userId: 'admin-1',
        role: Role.ADMIN,
      });
      mockPrisma.user.update.mockResolvedValue({
        userId: 'admin-1',
        isDeleted: false,
      });

      const result = await service.restoreAdmin('admin-1');

      expect(result.isDeleted).toBe(false);
    });
  });

  describe('banAdmin', () => {
    it('should suspend admin status', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        userId: 'admin-1',
        role: Role.ADMIN,
        isDeleted: false,
      });
      mockPrisma.user.update.mockResolvedValue({
        userId: 'admin-1',
        status: Status.SUSPEND,
      });

      const result = await service.banAdmin('admin-1');

      expect(result.status).toBe(Status.SUSPEND);
    });
  });
});
