import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto, VerificationDto, ChangePasswordDto, VerifyResetCodeDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
    private prisma: PrismaService,
  ) { }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const otp = Math.floor(100000 + Math.random() * 900000);
    const user = await this.usersService.create({
      ...registerDto,
      otp,
      isVerified: true,
    } as any);

    await this.mailService.sendVerificationCode(user.email, otp.toString());

    return { message: 'Registration successful. Your account has been verified automatically and a verification email has been sent.' };
  }

  async verify(verificationDto: VerificationDto) {
    const user = await this.usersService.findByEmail(verificationDto.email);
    if (!user || user.otp !== parseInt(verificationDto.code, 10)) {
      throw new BadRequestException('Invalid verification code');
    }

    await this.usersService.update(user.userId, {
      isVerified: true,
      otp: null,
    } as any);

    return { message: 'Email verified successfully' };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // For regular users, check verification
    if (user.role === 'USER' && !user.isVerified) {
      throw new UnauthorizedException('Email not verified');
    }

    const isPasswordValid = await this.usersService.verifyPassword(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens(user.userId, user.email, user.role);
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get('jwt.refreshSecret'),
      });

      const user = await this.prisma.user.findUnique({ where: { userId: payload.sub } });

      if (!user || user.refreshToken !== refreshToken) {
        throw new UnauthorizedException();
      }

      return this.generateTokens(user.userId, user.email, user.role);
    } catch (e) {
      throw new UnauthorizedException();
    }
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(forgotPasswordDto.email);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 10);

    await this.usersService.update(user.userId, {
      resetToken: code,
      resetTokenExpires: expiry,
    } as any);

    await this.mailService.sendPasswordReset(user.email, code);

    return { message: 'Password reset code sent to your email' };
  }

  async verifyResetCode(verifyResetCodeDto: VerifyResetCodeDto) {
    const user = await this.usersService.findByEmail(verifyResetCodeDto.email);
    if (!user || user.resetToken !== verifyResetCodeDto.code || !user.resetTokenExpires || user.resetTokenExpires < new Date()) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    // Generate a temporary JWT reset token valid for 15 minutes
    const resetToken = await this.jwtService.signAsync(
      { sub: user.userId, email: user.email, purpose: 'reset-password' },
      {
        secret: this.configService.get('jwt.secret'),
        expiresIn: '15m',
      },
    );

    return {
      message: 'OTP verified successfully. Use the provided reset token to change your password.',
      resetToken,
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    try {
      const payload = await this.jwtService.verifyAsync(resetPasswordDto.token, {
        secret: this.configService.get('jwt.secret'),
      });

      if (payload.purpose !== 'reset-password') {
        throw new BadRequestException('Invalid token');
      }

      const user = await this.usersService.findOne(payload.sub);
      if (!user) {
        throw new BadRequestException('User not found');
      }

      if (!user.resetToken) {
        throw new BadRequestException('Token has already been used or is invalid');
      }

      await this.usersService.update(user.userId, {
        password: resetPasswordDto.newPassword,
        resetToken: null,
        resetTokenExpires: null,
      } as any);

      return { message: 'Password reset successful' };
    } catch (e: any) {
      throw new BadRequestException(e.message || 'Invalid or expired reset token');
    }
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isPasswordValid = await this.usersService.verifyPassword(changePasswordDto.oldPassword, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Incorrect current password');
    }

    await this.usersService.update(userId, {
      password: changePasswordDto.newPassword,
    } as any);

    return { message: 'Password changed successfully' };
  }

  private async generateTokens(userId: string, email: string, role: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, email, role },
        {
          secret: this.configService.get('jwt.secret'),
          expiresIn: this.configService.get('jwt.expiresIn'),
        },
      ),
      this.jwtService.signAsync(
        { sub: userId },
        {
          secret: this.configService.get('jwt.refreshSecret'),
          expiresIn: this.configService.get('jwt.refreshExpiresIn'),
        },
      ),
    ]);

    await this.usersService.update(userId, { refreshToken } as any);

    return {
      accessToken,
      refreshToken,
    };
  }
}
