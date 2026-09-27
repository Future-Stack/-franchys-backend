import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  name: process.env.APP_NAME || 'aimalya',
  workingDirectory: process.cwd(),
  frontendDomain: process.env.FRONTEND_DOMAIN,
  backendDomain: process.env.BACKEND_DOMAIN,
  port: parseInt(process.env.APP_PORT || process.env.PORT || '3000', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  skipAuth: process.env.SKIP_AUTH === 'true',
  fallbackLanguage: process.env.APP_FALLBACK_LANGUAGE || 'en',
  headerLanguage: process.env.APP_HEADER_LANGUAGE || 'x-custom-lang',
}));
