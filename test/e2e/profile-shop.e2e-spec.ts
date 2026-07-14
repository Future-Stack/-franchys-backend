import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2EApp } from '../helpers/app.helper';
import {
  registerAndLogin,
  cleanupUser,
  AuthTokens,
} from '../helpers/auth.helper';
import {
  createTestPrisma,
  cleanupTest,
  seedShopInformation,
} from '../setup/test-helpers';

describe('Profile Shop (e2e)', () => {
  let app: INestApplication;
  let tokens: AuthTokens;
  const shopInformationIds: string[] = [];
  const originalEnv = process.env.SHOP_NAME;

  beforeAll(async () => {
    app = await createE2EApp();
    tokens = await registerAndLogin(app);

    // Seed shop matching environment name
    process.env.SHOP_NAME = 'Francys-E2E';
    const prisma = createTestPrisma();
    // Delete any existing Francys-E2E records to prevent unique constraints clash
    await prisma.shopInformation.deleteMany({
      where: { shopIdentifier: 'Francys-E2E' },
    });
    const shop = await seedShopInformation(prisma, {
      shopIdentifier: 'Francys-E2E',
    });
    shopInformationIds.push(shop.shopId);
    await prisma.$disconnect();
  });

  afterAll(async () => {
    process.env.SHOP_NAME = originalEnv;

    const prisma = createTestPrisma();
    await cleanupTest(prisma, { shopInformationIds });
    await prisma.$disconnect();

    await cleanupUser(tokens.email);
    await app.close();
  });

  // ─── GET /profile-shop ─────────────────────────────────────────────────────

  describe('GET /api/v1/profile-shop', () => {
    it('should retrieve active shop information', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/profile-shop')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.shopIdentifier).toBe('Francys-E2E');
    });

    it('should return 401 Unauthorized without bearer token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/profile-shop')
        .expect(401);
    });
  });

  // ─── PATCH /profile-shop ───────────────────────────────────────────────────

  describe('PATCH /api/v1/profile-shop', () => {
    it('should update active shop properties successfully', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/profile-shop')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          companyName: 'Updated Francys LLC',
          companyEmail: 'contact@francys.com',
          website: 'https://francys.com',
        })
        .expect(200);

      expect(res.body.data.companyName).toBe('Updated Francys LLC');
      expect(res.body.data.companyEmail).toBe('contact@francys.com');
      expect(res.body.data.website).toBe('https://francys.com');
    });
  });
});
