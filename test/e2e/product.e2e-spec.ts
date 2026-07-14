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
  seedCategory,
  seedBrand,
} from '../setup/test-helpers';

describe('Product (e2e)', () => {
  let app: INestApplication;
  let tokens: AuthTokens;
  let categoryId: string;
  let brandId: string;
  const productIds: string[] = [];
  const categoryIds: string[] = [];
  const brandIds: string[] = [];

  beforeAll(async () => {
    app = await createE2EApp();
    tokens = await registerAndLogin(app);

    const prisma = createTestPrisma();
    const cat = await seedCategory(prisma);
    const brand = await seedBrand(prisma);
    categoryId = cat.id;
    brandId = brand.id;
    categoryIds.push(cat.id);
    brandIds.push(brand.id);
    await prisma.$disconnect();
  });

  afterAll(async () => {
    const prisma = createTestPrisma();
    await cleanupTest(prisma, { productIds, categoryIds, brandIds });
    await prisma.$disconnect();

    await cleanupUser(tokens.email);
    await app.close();
  });

  // ─── POST /product ─────────────────────────────────────────────────────────

  describe('POST /api/v1/product', () => {
    it('should create a product successfully with response envelope', async () => {
      const itemNo = `TS-E2E-${Date.now()}`;
      const res = await request(app.getHttpServer())
        .post('/api/v1/product')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .field('productName', 'E2E Product')
        .field('itemNo', itemNo)
        .field('price', '29.99')
        .field('categoryId', categoryId)
        .field('brandId', brandId)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.productName).toBe('E2E Product');

      productIds.push(res.body.data.id);
    });

    it('should return 400 Bad Request on missing name field', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/product')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .field('price', '15.00')
        .expect(400);
    });
  });

  // ─── GET /product ──────────────────────────────────────────────────────────

  describe('GET /api/v1/product', () => {
    it('should return 200 OK with list of products', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/product')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ─── GET /product/:id ──────────────────────────────────────────────────────

  describe('GET /api/v1/product/:id', () => {
    it('should return 200 OK with product details', async () => {
      const productId = productIds[0];
      const res = await request(app.getHttpServer())
        .get(`/api/v1/product/${productId}`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(res.body.data.id).toBe(productId);
    });
  });

  // ─── PATCH /product/:id ────────────────────────────────────────────────────

  describe('PATCH /api/v1/product/:id', () => {
    it('should update product successfully', async () => {
      const productId = productIds[0];
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/product/${productId}`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .field('productName', 'E2E Updated Product')
        .expect(200);

      expect(res.body.data.productName).toBe('E2E Updated Product');
    });
  });

  // ─── POST /product/:id/colors ──────────────────────────────────────────────

  describe('POST /api/v1/product/:id/colors', () => {
    it('should add multiple colors to the product and return 201 Created', async () => {
      const productId = productIds[0];
      const res = await request(app.getHttpServer())
        .post(`/api/v1/product/${productId}/colors`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send([{ name: 'Magenta', code: '#FF00FF' }])
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });
  });

  // ─── DELETE /product/:id ───────────────────────────────────────────────────

  describe('DELETE /api/v1/product/:id', () => {
    let tempProductId: string;

    beforeAll(async () => {
      // Create product to delete
      const itemNo = `TS-DEL-${Date.now()}`;
      const res = await request(app.getHttpServer())
        .post('/api/v1/product')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .field('productName', 'Delete Me')
        .field('itemNo', itemNo)
        .field('price', '10.00')
        .field('categoryId', categoryId)
        .field('brandId', brandId);
      tempProductId = res.body.data.id;
      productIds.push(tempProductId);
    });

    it('should soft-delete product and return 200 OK', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/product/${tempProductId}`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should return 404 after deletion', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/product/${tempProductId}`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(404);
    });
  });
});
