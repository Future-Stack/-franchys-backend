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
import { TestingModuleBuilder } from '@nestjs/testing';

export async function createE2EApp(
  config?: (builder: TestingModuleBuilder) => void,
): Promise<INestApplication> {
  const builder = Test.createTestingModule({
    imports: [AppModule],
  });

  if (config) {
    config(builder);
  }

  const moduleFixture: TestingModule = await builder.compile();

  const app = moduleFixture.createNestApplication();

  app.setGlobalPrefix('api/v1', {
    exclude: ['/', 'health'],
  });
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  await app.init();
  return app;
}
