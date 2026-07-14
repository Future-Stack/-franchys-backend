import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2EApp } from '../helpers/app.helper';
import {
  registerAndLogin,
  cleanupUser,
  AuthTokens,
} from '../helpers/auth.helper';
import { createTestPrisma, cleanupTest } from '../setup/test-helpers';

describe('Vendors (e2e)', () => {
  let app: INestApplication;
  let tokens: AuthTokens;
  const vendorIds: string[] = [];

  beforeAll(async () => {
    app = await createE2EApp();
    tokens = await registerAndLogin(app);
  });

  afterAll(async () => {
    const prisma = createTestPrisma();
    await cleanupTest(prisma, { vendorIds });
    await prisma.$disconnect();

    await cleanupUser(tokens.email);
    await app.close();
  });

  // ─── POST /vendors ─────────────────────────────────────────────────────────

  describe('POST /api/v1/vendors', () => {
    it('should create a vendor successfully and return 201 Created', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/vendors')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          companyName: `E2E Company ${Date.now()}`,
          contactName: 'E2E Contact',
          email: 'e2e@vendor.com',
          phone: '1112223333',
          fax: '1112223334',
          accountNumber: 'ACC-E2E',
          mainAddress: 'Main St 100',
          city: 'Chicago',
          state: 'IL',
          country: 'USA',
          zip: '60601',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.vendorId).toBeDefined();

      vendorIds.push(res.body.data.vendorId);
    });

    it('should return 400 Bad Request on missing fields', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/vendors')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({ companyName: 'Inc' })
        .expect(400);
    });
  });

  // ─── GET /vendors ──────────────────────────────────────────────────────────

  describe('GET /api/v1/vendors', () => {
    it('should return 200 OK with paginated list of vendors', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/vendors?page=1&limit=5')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta.page).toBe(1);
    });
  });

  // ─── PATCH /vendors/:id ────────────────────────────────────────────────────

  describe('PATCH /api/v1/vendors/:id', () => {
    it('should update vendor details successfully', async () => {
      const vendorId = vendorIds[0];
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/vendors/${vendorId}`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({ companyName: 'Updated E2E Company' })
        .expect(200);

      expect(res.body.data.companyName).toBe('Updated E2E Company');
    });
  });

  // ─── PATCH /vendors/:id/status ─────────────────────────────────────────────

  describe('PATCH /api/v1/vendors/:id/status', () => {
    it('should change status of vendor successfully', async () => {
      const vendorId = vendorIds[0];
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/vendors/${vendorId}/status`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({ status: 'INACTIVE' })
        .expect(200);

      expect(res.body.data.status).toBe('INACTIVE');
    });
  });

  // ─── DELETE /vendors/:id ───────────────────────────────────────────────────

  describe('DELETE /api/v1/vendors/:id', () => {
    let tempVendorId: string;

    beforeAll(async () => {
      // Create a temporary vendor to delete
      const res = await request(app.getHttpServer())
        .post('/api/v1/vendors')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          companyName: `Del E2E Company ${Date.now()}`,
          contactName: 'E2E Del Contact',
          email: 'e2edel@vendor.com',
          phone: '1112223333',
          fax: '1112223334',
          accountNumber: 'ACC-E2E-DEL',
          mainAddress: 'Main St 200',
          city: 'Miami',
          state: 'FL',
          country: 'USA',
          zip: '33101',
        });
      tempVendorId = res.body.data.vendorId;
      vendorIds.push(tempVendorId);
    });

    it('should soft-delete vendor and return 200 OK', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/vendors/${tempVendorId}`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });
});
