import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2EApp } from '../helpers/app.helper';
import {
  registerAndLogin,
  cleanupUser,
  AuthTokens,
} from '../helpers/auth.helper';
import { createTestPrisma, cleanupTest } from '../setup/test-helpers';

describe('Category (e2e)', () => {
  let app: INestApplication;
  let tokens: AuthTokens;
  const categoryIds: string[] = [];

  beforeAll(async () => {
    app = await createE2EApp();
    tokens = await registerAndLogin(app);
  });

  afterAll(async () => {
    const prisma = createTestPrisma();
    await cleanupTest(prisma, { categoryIds });
    await prisma.$disconnect();

    await cleanupUser(tokens.email);
    await app.close();
  });

  // ─── POST /category ────────────────────────────────────────────────────────

  describe('POST /api/v1/category', () => {
    it('should create a category and return 201 with response envelope', async () => {
      const name = `E2E Category ${Date.now()}`;
      const res = await request(app.getHttpServer())
        .post('/api/v1/category')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          name,
          description: 'E2E Category Desc',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.name).toBe(name);

      categoryIds.push(res.body.data.id);
    });

    it('should return 400 Bad Request on invalid input', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/category')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({ description: 'No name' }) // Missing required name
        .expect(400);
    });

    it('should return 401 Unauthorized without bearer token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/category')
        .send({ name: 'Unauth Category' })
        .expect(401);
    });
  });

  // ─── GET /category ─────────────────────────────────────────────────────────

  describe('GET /api/v1/category', () => {
    it('should return 200 OK with list of categories', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/category')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ─── GET /category/:id ──────────────────────────────────────────────────────

  describe('GET /api/v1/category/:id', () => {
    it('should return 200 OK with category details', async () => {
      const categoryId = categoryIds[0];
      const res = await request(app.getHttpServer())
        .get(`/api/v1/category/${categoryId}`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(res.body.data.id).toBe(categoryId);
    });

    it('should return 404 Not Found for non-existing category ID', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/category/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(404);
    });
  });

  // ─── PATCH /category/:id ────────────────────────────────────────────────────

  describe('PATCH /api/v1/category/:id', () => {
    it('should update category properties successfully', async () => {
      const categoryId = categoryIds[0];
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/category/${categoryId}`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({ description: 'Updated E2E Category Desc' })
        .expect(200);

      expect(res.body.data.description).toBe('Updated E2E Category Desc');
    });
  });

  // ─── DELETE /category/:id ───────────────────────────────────────────────────

  describe('DELETE /api/v1/category/:id', () => {
    let tempCategoryId: string;

    beforeAll(async () => {
      const name = `E2E Category Del ${Date.now()}`;
      const res = await request(app.getHttpServer())
        .post('/api/v1/category')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          name,
          description: 'To delete',
        });
      tempCategoryId = res.body.data.id;
    });

    it('should soft-delete category and return 200 OK', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/category/${tempCategoryId}`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should return 404 after deletion', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/category/${tempCategoryId}`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(404);
    });
  });
});
