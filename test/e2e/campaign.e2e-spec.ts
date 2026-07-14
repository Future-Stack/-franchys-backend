import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2EApp } from '../helpers/app.helper';
import {
  registerAndLogin,
  cleanupUser,
  AuthTokens,
} from '../helpers/auth.helper';
import { createTestPrisma, cleanupTest } from '../setup/test-helpers';

// ─── E2E: Campaign Endpoints ──────────────────────────────────────────────────

describe('Campaign (e2e)', () => {
  let app: INestApplication;
  let tokens: AuthTokens;
  const campaignIds: string[] = [];

  beforeAll(async () => {
    app = await createE2EApp();
    tokens = await registerAndLogin(app);
  });

  afterAll(async () => {
    const prisma = createTestPrisma();
    await cleanupTest(prisma, { campaignIds });
    await prisma.$disconnect();

    await cleanupUser(tokens.email);
    await app.close();
  });

  // ─── POST /campaign ───────────────────────────────────────────────────────

  describe('POST /api/v1/campaign', () => {
    it('should create a campaign and return 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/campaign')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          title: 'Summer Sale E2E',
          type: 'DISCOUNT',
          promoCode: `SUMMER-${Date.now()}`,
          discountType: 'percentage',
          percentage: 15,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.status).toBe('DRAFT');

      campaignIds.push(res.body.data.id);
    });

    it('should return 400 when required fields are missing', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/campaign')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({ title: 'No Type' }) // missing required type
        .expect(400);
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/campaign')
        .send({})
        .expect(401);
    });
  });

  // ─── GET /campaign ────────────────────────────────────────────────────────

  describe('GET /api/v1/campaign', () => {
    it('should return 200 with an array', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/campaign')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should filter by type=DISCOUNT', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/campaign?type=DISCOUNT')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(
        res.body.data.every((c: { type: string }) => c.type === 'DISCOUNT'),
      ).toBe(true);
    });
  });

  // ─── POST /campaign/:id/send ──────────────────────────────────────────────

  describe('POST /api/v1/campaign/:id/send', () => {
    it('should update status to SENT and return 201', async () => {
      const campaignId = campaignIds[0];
      const res = await request(app.getHttpServer())
        .post(`/api/v1/campaign/${campaignId}/send`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(201);

      expect(res.body.data.status).toBe('SENT');
    });
  });

  // ─── POST /campaign/validate-code ─────────────────────────────────────────

  describe('POST /api/v1/campaign/validate-code', () => {
    let promoCode: string;

    beforeAll(async () => {
      // Create a SENT campaign with a flat discount code
      promoCode = `FLAT-${Date.now()}`;
      const res = await request(app.getHttpServer())
        .post('/api/v1/campaign')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          title: 'Flat Discount E2E',
          type: 'DISCOUNT',
          promoCode,
          discountType: 'flat',
          percentage: 30,
        });

      const campaignId = res.body.data.id;
      campaignIds.push(campaignId);

      await request(app.getHttpServer())
        .post(`/api/v1/campaign/${campaignId}/send`)
        .set('Authorization', `Bearer ${tokens.accessToken}`);
    });

    it('should validate a SENT discount code and return discount amounts', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/campaign/validate-code')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({ code: promoCode, orderAmount: 200 })
        .expect(201);

      expect(res.body.data.valid).toBe(true);
      expect(res.body.data.discountAmount).toBe(30);
      expect(res.body.data.finalAmount).toBe(170);
    });

    it('should return 404 for unknown promo code', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/campaign/validate-code')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({ code: 'DOESNOTEXIST', orderAmount: 100 })
        .expect(404);
    });
  });

  // ─── DELETE /campaign/:id ─────────────────────────────────────────────────

  describe('DELETE /api/v1/campaign/:id', () => {
    let tempCampaignId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/campaign')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({ title: 'To Delete', type: 'NEWSLETTER' });
      tempCampaignId = res.body.data.id;
    });

    it('should delete campaign and return 200', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/campaign/${tempCampaignId}`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should return 404 after deletion', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/campaign/${tempCampaignId}`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(404);
    });
  });
});
