import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2EApp } from '../helpers/app.helper';
import {
  registerAndLogin,
  cleanupUser,
  AuthTokens,
} from '../helpers/auth.helper';
import { createTestPrisma, cleanupTest } from '../setup/test-helpers';

describe('Invoice (e2e)', () => {
  let app: INestApplication;
  let tokens: AuthTokens;
  const invoiceFeeIds: string[] = [];
  const invoiceInformationIds: string[] = [];

  beforeAll(async () => {
    app = await createE2EApp();
    tokens = await registerAndLogin(app);
  });

  afterAll(async () => {
    const prisma = createTestPrisma();
    await cleanupTest(prisma, { invoiceFeeIds, invoiceInformationIds });
    await prisma.$disconnect();

    await cleanupUser(tokens.email);
    await app.close();
  });

  // ─── POST /invoice/fees ───────────────────────────────────────────────────

  describe('POST /api/v1/invoice/fees', () => {
    it('should create an invoice fee successfully and return 201 Created', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/invoice/fees')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          feeName: 'Standard Shipping',
          amount: 15,
          isTax: false,
          isDefaultAutoAdd: true,
        })
        .expect(201);

      expect(res.body.data.infId).toBeDefined();
      expect(res.body.data.feeName).toBe('Standard Shipping');

      invoiceFeeIds.push(res.body.data.infId);
    });

    it('should return 400 Bad Request on invalid fields', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/invoice/fees')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({ feeName: '' })
        .expect(400);
    });
  });

  // ─── GET /invoice/fees ────────────────────────────────────────────────────

  describe('GET /api/v1/invoice/fees', () => {
    it('should return 200 OK with list of all invoice fees', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/invoice/fees')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ─── PATCH /invoice/fees/:id ──────────────────────────────────────────────

  describe('PATCH /api/v1/invoice/fees/:infId', () => {
    it('should update invoice fee details successfully', async () => {
      const feeId = invoiceFeeIds[0];
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/invoice/fees/${feeId}`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({ amount: 20 })
        .expect(200);

      expect(res.body.data.amount).toBe(20);
    });
  });

  // ─── GET /invoice/information ─────────────────────────────────────────────

  describe('GET /api/v1/invoice/information', () => {
    it('should retrieve active invoice information settings', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/invoice/information')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(res.body.data.currency).toBeDefined();
      expect(res.body.data.iniId).toBeDefined();

      invoiceInformationIds.push(res.body.data.iniId);
    });
  });

  // ─── PATCH /invoice/information ───────────────────────────────────────────

  describe('PATCH /api/v1/invoice/information', () => {
    it('should update active invoice information details successfully', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/invoice/information')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          currency: 'EUR',
          language: 'German',
          termsAndCondition: 'German T&Cs',
        })
        .expect(200);

      expect(res.body.data.currency).toBe('EUR');
      expect(res.body.data.language).toBe('German');
    });
  });

  // ─── DELETE /invoice/fees/:id ─────────────────────────────────────────────

  describe('DELETE /api/v1/invoice/fees/:infId', () => {
    let tempFeeId: string;

    beforeAll(async () => {
      // Create a temporary fee to delete
      const res = await request(app.getHttpServer())
        .post('/api/v1/invoice/fees')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          feeName: 'Express Shipping',
          amount: 30,
          isTax: false,
          isDefaultAutoAdd: false,
        });
      tempFeeId = res.body.data.infId;
      invoiceFeeIds.push(tempFeeId);
    });

    it('should delete fee and return 200 OK', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/invoice/fees/${tempFeeId}`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(res.body.data.message).toBe('Invoice fee deleted successfully');
    });
  });
});
