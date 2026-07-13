import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestPrisma, cleanupTest } from '../setup/test-helpers';

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export interface AuthTokens {
  accessToken: string;
  userId: string;
  email: string;
}

/**
 * Registers a fresh ADMIN user then logs in to obtain a JWT access token.
 * - Register sets isVerified=true automatically in this app.
 * - Login returns { accessToken, refreshToken } — userId/email are decoded from the JWT payload.
 * - NestJS POST endpoints return HTTP 201 by default.
 */
export async function registerAndLogin(app: INestApplication): Promise<AuthTokens> {
  const email = `e2e-admin-${uid()}@franchys-test.com`;
  const password = 'Test@12345';

  // 1. Register
  await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({ name: 'E2E Admin', email, password })
    .expect(201);

  // Elevate registered user to ADMIN role in database
  const prisma = createTestPrisma();
  try {
    await prisma.user.update({
      where: { email },
      data: { role: 'ADMIN' },
    });
  } finally {
    await prisma.$disconnect();
  }

  // 2. Login — NestJS @Post defaults to 201
  const loginRes = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password })
    .expect(201);

  const { accessToken } = loginRes.body.data as { accessToken: string };

  // Decode JWT payload (no verification needed — this is a test helper)
  const payload = JSON.parse(
    Buffer.from(accessToken.split('.')[1], 'base64url').toString('utf8'),
  ) as { sub: string; email: string };

  return { accessToken, userId: payload.sub, email: payload.email };
}

/**
 * Deletes the E2E test user by email from the DB directly.
 */
export async function cleanupUser(email: string): Promise<void> {
  const prisma = createTestPrisma();
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      await cleanupTest(prisma, { userIds: [user.userId] });
    }
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Seeds a customer in the test DB and returns its id and a cleanup function.
 */
export async function seedTestCustomer(): Promise<{
  id: string;
  cleanup: () => Promise<void>;
}> {
  const prisma = createTestPrisma();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { seedCustomer, cleanupTest: ct } = require('../setup/test-helpers') as typeof import('../setup/test-helpers');
  const customer = await seedCustomer(prisma);
  return {
    id: customer.id,
    cleanup: async () => {
      await ct(prisma, { customerIds: [customer.id] });
      await prisma.$disconnect();
    },
  };
}
