import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization;

    // If client supplied a Bearer token, validate the actual token
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return super.canActivate(context);
    }

    // Local Development Authentication Bypass:
    // When SKIP_AUTH=true and NOT in production, bypass auth and inject superadmin mock user
    const isDev =
      this.configService.get<string>('app.nodeEnv') !== 'production';
    const skipAuth = this.configService.get<boolean>('app.skipAuth');
    if (isDev && skipAuth) {
      request.user = {
        userId: '988867be-8440-4d36-995c-cf61bee1a766',
        email:
          this.configService.get<string>('SUPER_ADMIN_EMAIL') ||
          'superadmin@example.com',
        role: 'SUPER_ADMIN',
      };
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any) {
    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    return user;
  }
}
