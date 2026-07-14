import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret') || 'super_secret',
    });
  }

  async validate(payload: any) {
    const findUser = await this.prisma.user.findUnique({
      where: { userId: payload.sub },
    });

    if (!findUser) {
      throw new Error('User not valid');
    }

    if (payload.sub !== findUser.userId) {
      throw new Error('User not valid');
    }

    if (payload.email !== findUser.email) {
      throw new Error('User not valid');
    }

    if (payload.role !== findUser.role) {
      throw new Error('User not valid');
    }

    if (findUser.status === 'SUSPEND') {
      throw new Error(
        'You are a suspended user. Please contact support for more information.',
      );
    }

    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
