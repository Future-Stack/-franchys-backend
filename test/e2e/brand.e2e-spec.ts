import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2EApp } from '../helpers/app.helper';
import {
  registerAndLogin,
  cleanupUser,
  AuthTokens,
} from '../helpers/auth.helper';
import { createTestPrisma, cleanupTest } from '../setup/test-helpers';

describe('Brand (e2e)', () => {
  let app: INestApplication;
  let tokens: AuthTokens;
  const brandIds: string[] = [];

  beforeAll(async () => {
    app = await createE2EApp();
    tokens = await registerAndLogin(app);
  });

  afterAll(async () => {
    const prisma = createTestPrisma();
    await cleanupTest(prisma, { brandIds });
    await prisma.$disconnect();

    await cleanupUser(tokens.email);
    await app.close();
  });

  // ─── POST /brand ──────────────────────────────────────────────────────────

  describe('POST /api/v1/brand', () => {
    it('should create a brand and return 201 with response envelope', async () => {
      const name = `E2E Brand ${Date.now()}`;
      const res = await request(app.getHttpServer())
        .post('/api/v1/brand')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          name,
          description: 'E2E Brand Desc',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.name).toBe(name);

      brandIds.push(res.body.data.id);
    });

    it('should return 400 Bad Request on invalid input', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/brand')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({ description: 'No name' }) // Missing required name
        .expect(400);
    });

    it('should return 401 Unauthorized without bearer token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/brand')
        .send({ name: 'Unauth Brand' })
        .expect(401);
    });
  });

  // ─── GET /brand ───────────────────────────────────────────────────────────

  describe('GET /api/v1/brand', () => {
    it('should return 200 OK with list of brands', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/brand')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ─── GET /brand/:id ────────────────────────────────────────────────────────

  describe('GET /api/v1/brand/:id', () => {
    it('should return 200 OK with brand details', async () => {
      const brandId = brandIds[0];
      const res = await request(app.getHttpServer())
        .get(`/api/v1/brand/${brandId}`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(res.body.data.id).toBe(brandId);
    });

    it('should return 404 Not Found for non-existing brand ID', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/brand/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(404);
    });
  });

  // ─── PATCH /brand/:id ──────────────────────────────────────────────────────

  describe('PATCH /api/v1/brand/:id', () => {
    it('should update brand properties successfully', async () => {
      const brandId = brandIds[0];
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/brand/${brandId}`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({ description: 'Updated E2E Brand Desc' })
        .expect(200);

      expect(res.body.data.description).toBe('Updated E2E Brand Desc');
    });
  });

  // ─── DELETE /brand/:id ─────────────────────────────────────────────────────

  describe('DELETE /api/v1/brand/:id', () => {
    let tempBrandId: string;

    beforeAll(async () => {
      const name = `E2E Brand Del ${Date.now()}`;
      const res = await request(app.getHttpServer())
        .post('/api/v1/brand')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          name,
          description: 'To delete',
        });
      tempBrandId = res.body.data.id;
    });

    it('should soft-delete brand and return 200 OK', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/brand/${tempBrandId}`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should return 404 after deletion', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/brand/${tempBrandId}`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(404);
    });
  });
});
