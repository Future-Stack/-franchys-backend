import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockUsersService = {
  findByEmail: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  verifyPassword: jest.fn(),
  findOne: jest.fn(),
};

const mockJwtService = {
  signAsync: jest.fn(),
  verify: jest.fn(),
  verifyAsync: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, string> = {
      'jwt.secret': 'test-secret',
      'jwt.expiresIn': '15m',
      'jwt.refreshSecret': 'test-refresh-secret',
      'jwt.refreshExpiresIn': '7d',
    };
    return config[key];
  }),
};

const mockMailService = {
  sendVerificationCode: jest.fn(),
  sendPasswordReset: jest.fn(),
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
};

describe('AuthService (unit)', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockJwtService.signAsync.mockReset();
    mockJwtService.verifyAsync.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: MailService, useValue: mockMailService },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    const dto = {
      name: 'Admin',
      email: 'admin@test.com',
      password: 'password123',
    };

    it('should register successfully', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue({
        email: dto.email,
        userId: 'user-1',
      });

      const result = await service.register(dto);

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(dto.email);
      expect(mockUsersService.create).toHaveBeenCalled();
      expect(mockMailService.sendVerificationCode).toHaveBeenCalled();
      expect(result.message).toContain('Registration successful');
    });

    it('should throw ConflictException if email exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ userId: 'existing' });

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('verify', () => {
    it('should verify OTP successfully', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        userId: 'user-1',
        otp: 123456,
      });
      mockUsersService.update.mockResolvedValue({});

      const result = await service.verify({
        email: 'test@test.com',
        code: '123456',
      });

      expect(mockUsersService.update).toHaveBeenCalledWith('user-1', {
        isVerified: true,
        otp: null,
      });
      expect(result.message).toBe('Email verified successfully');
    });

    it('should throw BadRequestException on invalid code', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        userId: 'user-1',
        otp: 123456,
      });

      await expect(
        service.verify({ email: 'test@test.com', code: '000000' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('login', () => {
    const loginDto = { email: 'admin@test.com', password: 'password123' };
    const userObj = {
      userId: 'user-1',
      email: 'admin@test.com',
      role: 'ADMIN',
      isVerified: true,
      password: 'hashed',
    };

    it('should log in successfully and return tokens', async () => {
      mockUsersService.findByEmail.mockResolvedValue(userObj);
      mockUsersService.verifyPassword.mockResolvedValue(true);
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.login(loginDto);

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });

    it('should throw UnauthorizedException for unknown email', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      mockUsersService.findByEmail.mockResolvedValue(userObj);
      mockUsersService.verifyPassword.mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if USER role is not verified', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        ...userObj,
        role: 'USER',
        isVerified: false,
      });

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refresh', () => {
    it('should refresh tokens successfully', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user-1' });
      mockPrisma.user.findUnique.mockResolvedValue({
        userId: 'user-1',
        email: 'test@test.com',
        role: 'ADMIN',
        refreshToken: 'old-refresh-token',
      });
      mockJwtService.signAsync
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');

      const result = await service.refresh('old-refresh-token');

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
    });

    it('should throw UnauthorizedException on invalid token verify', async () => {
      mockJwtService.verifyAsync.mockImplementation(() => {
        throw new Error();
      });

      await expect(service.refresh('bad-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('forgotPassword', () => {
    it('should generate reset code successfully', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        userId: 'user-1',
        email: 'test@test.com',
      });
      mockUsersService.update.mockResolvedValue({});

      const result = await service.forgotPassword({ email: 'test@test.com' });

      expect(mockMailService.sendPasswordReset).toHaveBeenCalled();
      expect(result.message).toBe('Password reset code sent to your email');
    });

    it('should throw BadRequestException if user email not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.forgotPassword({ email: 'none@test.com' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifyResetCode', () => {
    it('should verify reset code and return reset token', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      mockUsersService.findByEmail.mockResolvedValue({
        userId: 'user-1',
        email: 'test@test.com',
        resetToken: '123456',
        resetTokenExpires: tomorrow,
      });
      mockJwtService.signAsync.mockResolvedValue('jwt-reset-token');

      const result = await service.verifyResetCode({
        email: 'test@test.com',
        code: '123456',
      });

      expect(result.resetToken).toBe('jwt-reset-token');
    });

    it('should throw BadRequestException if code is invalid or expired', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.verifyResetCode({ email: 'test@test.com', code: 'bad-code' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: 'user-1',
        purpose: 'reset-password',
      });
      mockUsersService.findOne.mockResolvedValue({
        userId: 'user-1',
        resetToken: 'active-token',
      });
      mockUsersService.update.mockResolvedValue({});

      const result = await service.resetPassword({
        token: 'jwt-token',
        newPassword: 'new-pass',
      });

      expect(result.message).toBe('Password reset successful');
    });

    it('should throw BadRequestException if token purpose is invalid', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: 'user-1',
        purpose: 'invalid-purpose',
      });

      await expect(
        service.resetPassword({ token: 'jwt-token', newPassword: 'new-pass' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getMe', () => {
    it('should return user profile details', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        userId: 'user-1',
        email: 'test@test.com',
        name: 'Test User',
      });

      const result = await service.getMe('user-1');

      expect(result).toEqual({
        userId: 'user-1',
        email: 'test@test.com',
        name: 'Test User',
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getMe('invalid-id')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      mockUsersService.findOne.mockResolvedValue({
        userId: 'user-1',
        password: 'old-hashed',
      });
      mockUsersService.verifyPassword.mockResolvedValue(true);
      mockUsersService.update.mockResolvedValue({});

      const result = await service.changePassword('user-1', {
        oldPassword: 'old-pass',
        newPassword: 'new-pass',
      });

      expect(result.message).toBe('Password changed successfully');
    });

    it('should throw BadRequestException if old password does not match', async () => {
      mockUsersService.findOne.mockResolvedValue({
        userId: 'user-1',
        password: 'old-hashed',
      });
      mockUsersService.verifyPassword.mockResolvedValue(false);

      await expect(
        service.changePassword('user-1', {
          oldPassword: 'wrong-pass',
          newPassword: 'new',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
