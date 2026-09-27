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

    // Local Development Authentication Bypass:
    // When SKIP_AUTH=true and NOT in production, bypass auth and inject superadmin mock user
    const isDev =
      this.configService.get<string>('app.nodeEnv') !== 'production';
    const skipAuth = this.configService.get<boolean>('app.skipAuth');
    if (isDev && skipAuth) {
      const request = context.switchToHttp().getRequest();
      request.user = {
        userId: 'dev-super-admin-id',
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
