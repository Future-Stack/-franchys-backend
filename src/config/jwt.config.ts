import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: (process.env.JWT_SECRET || 'super_secret').trim(),
  expiresIn: (process.env.JWT_EXPIRES_IN || '1h').trim(),
  refreshSecret: (
    process.env.JWT_REFRESH_SECRET || 'refresh_super_secret'
  ).trim(),
  refreshExpiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d').trim(),
}));
