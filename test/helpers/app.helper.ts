import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { GlobalExceptionFilter } from 'src/common/filters/global-exception.filter';
import { TransformInterceptor } from 'src/common/interceptors/transform.interceptor';

/**
 * Boots a full NestJS application using the real AppModule
 * (connected to the Neon test DB via .env.test).
 *
 * Mirrors the bootstrap() configuration in main.ts so that
 * global prefix, pipes, filters, and interceptors match production.
 */
export async function createE2EApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();

  app.setGlobalPrefix('api/v1');
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  await app.init();
  return app;
}
