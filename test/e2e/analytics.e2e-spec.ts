import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2EApp } from '../helpers/app.helper';
import { registerAndLogin, cleanupUser, AuthTokens } from '../helpers/auth.helper';

// ─── E2E: Analytics Endpoints ─────────────────────────────────────────────────

describe('Analytics (e2e)', () => {
  let app: INestApplication;
  let tokens: AuthTokens;

  beforeAll(async () => {
    app = await createE2EApp();
    tokens = await registerAndLogin(app);
  });

  afterAll(async () => {
    await cleanupUser(tokens.email);
    await app.close();
  });

  // ─── GET /analytics/dashboard ─────────────────────────────────────────────

  describe('GET /api/v1/analytics/dashboard', () => {
    it('should return 200 with correct response envelope', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/analytics/dashboard')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('should return all required dashboard fields', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/analytics/dashboard')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      const data = res.body.data;
      expect(data).toHaveProperty('summary');
      expect(data).toHaveProperty('revenueTrends');
      expect(data).toHaveProperty('topCustomers');
      expect(data).toHaveProperty('categoryPerformance');
    });

    it('should return summary with numeric fields', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/analytics/dashboard')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      const { summary } = res.body.data;
      expect(typeof summary.totalRevenue).toBe('number');
      expect(typeof summary.conversionRate).toBe('number');
      expect(summary.conversionRate).toBeGreaterThanOrEqual(0);
      expect(summary.conversionRate).toBeLessThanOrEqual(100);
    });

    it('should return revenueTrends as array of 6 months', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/analytics/dashboard')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      const { revenueTrends } = res.body.data;
      expect(Array.isArray(revenueTrends)).toBe(true);
      expect(revenueTrends).toHaveLength(6);
      expect(revenueTrends[0]).toHaveProperty('month');
      expect(revenueTrends[0]).toHaveProperty('revenue');
    });

    it('should return topCustomers as an array', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/analytics/dashboard')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(Array.isArray(res.body.data.topCustomers)).toBe(true);
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/analytics/dashboard')
        .expect(401);
    });
  });
});
