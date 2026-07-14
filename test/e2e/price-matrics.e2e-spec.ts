import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2EApp } from '../helpers/app.helper';
import {
  registerAndLogin,
  cleanupUser,
  AuthTokens,
} from '../helpers/auth.helper';
import { createTestPrisma, cleanupTest } from '../setup/test-helpers';

describe('Price Matrices (e2e)', () => {
  let app: INestApplication;
  let tokens: AuthTokens;
  const priceMatrixIds: string[] = [];
  const priceTierIds: string[] = [];

  beforeAll(async () => {
    app = await createE2EApp();
    tokens = await registerAndLogin(app);
  });

  afterAll(async () => {
    const prisma = createTestPrisma();
    await cleanupTest(prisma, { priceMatrixIds, priceTierIds });
    await prisma.$disconnect();

    await cleanupUser(tokens.email);
    await app.close();
  });

  // ─── POST /price-matrics ──────────────────────────────────────────────────

  describe('POST /api/v1/price-matrics', () => {
    it('should create price matrix with nested tiers successfully', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/price-matrics')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          name: 'Bulk Hoodies Pricing',
          priceType: 'markup',
          priceTiers: [{ quantity: 15, basePrice: 22.5, markup: 6.0 }],
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.priceMatrixId).toBeDefined();
      expect(res.body.data.priceTiers).toHaveLength(1);

      priceMatrixIds.push(res.body.data.priceMatrixId);
      priceTierIds.push(res.body.data.priceTiers[0].priceTierId);
    });

    it('should return 400 Bad Request on missing fields', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/price-matrics')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({ priceType: 'markup' }) // missing name
        .expect(400);
    });
  });

  // ─── GET /price-matrics ───────────────────────────────────────────────────

  describe('GET /api/v1/price-matrics', () => {
    it('should return 200 OK with list of all price matrices', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/price-matrics')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ─── GET /price-matrics/:id ───────────────────────────────────────────────

  describe('GET /api/v1/price-matrics/:priceMatrixId', () => {
    it('should return 200 OK with specific matrix details', async () => {
      const id = priceMatrixIds[0];
      const res = await request(app.getHttpServer())
        .get(`/api/v1/price-matrics/${id}`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(res.body.data.priceMatrixId).toBe(id);
    });
  });

  // ─── PATCH /price-matrics/:id ─────────────────────────────────────────────

  describe('PATCH /api/v1/price-matrics/:priceMatrixId', () => {
    it('should update matrix details successfully', async () => {
      const id = priceMatrixIds[0];
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/price-matrics/${id}`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({ name: 'Bulk Hoodies Updated' })
        .expect(200);

      expect(res.body.data.name).toBe('Bulk Hoodies Updated');
    });
  });

  // ─── POST /price-matrics/:id/tiers ────────────────────────────────────────

  describe('POST /api/v1/price-matrics/:priceMatrixId/tiers', () => {
    it('should add a tier directly and return 201 Created', async () => {
      const id = priceMatrixIds[0];
      const res = await request(app.getHttpServer())
        .post(`/api/v1/price-matrics/${id}/tiers`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({ quantity: 100, basePrice: 15.0, markup: 4.0 })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.priceTierId).toBeDefined();

      priceTierIds.push(res.body.data.priceTierId);
    });
  });

  // ─── PATCH /price-matrics/:id/tiers/:tierId ────────────────────────────────

  describe('PATCH /api/v1/price-matrics/:priceMatrixId/tiers/:priceTierId', () => {
    it('should update specific tier properties successfully', async () => {
      const id = priceMatrixIds[0];
      const tierId = priceTierIds[0];
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/price-matrics/${id}/tiers/${tierId}`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({ quantity: 180, basePrice: 14.0, markup: 3.5 })
        .expect(200);

      expect(res.body.data.quantity).toBe(180);
    });
  });

  // ─── DELETE /price-matrics/:id/tiers/:tierId ───────────────────────────────

  describe('DELETE /api/v1/price-matrics/:priceMatrixId/tiers/:priceTierId', () => {
    let tempTierId: string;
    let parentId: string;

    beforeAll(async () => {
      parentId = priceMatrixIds[0];
      const res = await request(app.getHttpServer())
        .post(`/api/v1/price-matrics/${parentId}/tiers`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({ quantity: 300, basePrice: 10.0, markup: 2.0 });
      tempTierId = res.body.data.priceTierId;
      priceTierIds.push(tempTierId);
    });

    it('should delete specific tier and return 200 OK', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/price-matrics/${parentId}/tiers/${tempTierId}`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });
});
