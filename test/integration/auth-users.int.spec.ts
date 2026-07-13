import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaClient, Role, Status } from '@prisma/client';
import { UsersService } from 'src/modules/users/users.service';
import { AuthService } from 'src/modules/auth/auth.service';
import { MailService } from 'src/modules/mail/mail.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { createTestPrisma, cleanupTest, seedUser } from '../setup/test-helpers';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';

describe('Auth & Users (integration)', () => {
  let module: TestingModule;
  let usersService: UsersService;
  let authService: AuthService;
  let prisma: PrismaClient;
  const userIds: string[] = [];

  beforeAll(async () => {
    prisma = createTestPrisma();

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        JwtModule.register({ secret: 'test-secret' }),
      ],
      providers: [
        UsersService,
        AuthService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: MailService,
          useValue: {
            sendVerificationCode: jest.fn().mockResolvedValue(true),
            sendPasswordReset: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    usersService = module.get<UsersService>(UsersService);
    authService = module.get<AuthService>(AuthService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await module.close();
  });

  afterEach(async () => {
    await cleanupTest(prisma, { userIds });
    userIds.length = 0;
  });

  describe('User Registration & Verification Lifecycle', () => {
    it('should successfully complete user register and verify', async () => {
      const email = `lifecycle-${Date.now()}@test.com`;
      const regResult = await authService.register({
        name: 'Register User',
        email,
        password: 'Password123!',
      });

      expect(regResult.message).toContain('Registration successful');

      // Fetch newly registered user
      const dbUser = await prisma.user.findUnique({ where: { email } });
      expect(dbUser).toBeDefined();
      userIds.push(dbUser!.userId);

      // Verify OTP step
      expect(dbUser!.otp).toBeDefined();
      const verifyResult = await authService.verify({
        email,
        code: dbUser!.otp!.toString(),
      });
      expect(verifyResult.message).toBe('Email verified successfully');

      // Check updated fields in DB
      const freshUser = await prisma.user.findUnique({ where: { email } });
      expect(freshUser!.isVerified).toBe(true);
      expect(freshUser!.otp).toBeNull();
    });

    it('should throw ConflictException if registering existing email', async () => {
      const email = `existing-${Date.now()}@test.com`;
      const user = await seedUser(prisma, { email });
      userIds.push(user.userId);

      await expect(
        authService.register({
          name: 'Dupe',
          email,
          password: 'Password123!',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Admins Management Transactions', () => {
    it('should create admin and permissions row inside transaction', async () => {
      const email = `admin-tx-${Date.now()}@test.com`;
      const admin = await usersService.createAdmin({
        name: 'Tx Admin',
        email,
        password: 'Password123!',
        permissions: { canApproveQuotes: true },
      });

      userIds.push(admin.userId);

      expect(admin.role).toBe(Role.ADMIN);
      expect(admin.permissions.canApproveQuotes).toBe(true);

      // Check DB directly
      const dbPerm = await prisma.userPermission.findUnique({
        where: { userId: admin.userId },
      });
      expect(dbPerm).toBeDefined();
      expect(dbPerm?.canApproveQuotes).toBe(true);
    });

    it('should update admin details and permissions together', async () => {
      const email = `admin-upd-${Date.now()}@test.com`;
      const admin = await usersService.createAdmin({
        name: 'Upd Admin',
        email,
        password: 'Password123!',
        permissions: { canApproveQuotes: true },
      });
      userIds.push(admin.userId);

      const updated = await usersService.updateAdmin(admin.userId, {
        name: 'Name Changed',
        permissions: { canApproveQuotes: false },
      });

      expect(updated.name).toBe('Name Changed');
      expect(updated.permissions.canApproveQuotes).toBe(false);

      const dbPerm = await prisma.userPermission.findUnique({
        where: { userId: admin.userId },
      });
      expect(dbPerm?.canApproveQuotes).toBe(false);
    });

    it('should soft delete and restore admin', async () => {
      const email = `admin-del-${Date.now()}@test.com`;
      const admin = await usersService.createAdmin({
        name: 'Del Admin',
        email,
        password: 'Password123!',
        permissions: { canApproveQuotes: false },
      });
      userIds.push(admin.userId);

      // Soft delete
      const deleted = await usersService.softDeleteAdmin(admin.userId);
      expect(deleted.isDeleted).toBe(true);

      // Restore
      const restored = await usersService.restoreAdmin(admin.userId);
      expect(restored.isDeleted).toBe(false);
    });

    it('should ban admin successfully', async () => {
      const email = `admin-ban-${Date.now()}@test.com`;
      const admin = await usersService.createAdmin({
        name: 'Ban Admin',
        email,
        password: 'Password123!',
        permissions: { canApproveQuotes: false },
      });
      userIds.push(admin.userId);

      // Ban/Suspend status
      const banned = await usersService.banAdmin(admin.userId);
      expect(banned.status).toBe(Status.SUSPEND);
    });
  });
});
