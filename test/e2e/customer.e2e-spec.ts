import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2EApp } from '../helpers/app.helper';
import {
  registerAndLogin,
  cleanupUser,
  AuthTokens,
} from '../helpers/auth.helper';
import { createTestPrisma, cleanupTest } from '../setup/test-helpers';
import { CustomerType } from '@prisma/client';

describe('Customer (e2e)', () => {
  let app: INestApplication;
  let tokens: AuthTokens;
  const customerIds: string[] = [];

  beforeAll(async () => {
    app = await createE2EApp();
    tokens = await registerAndLogin(app);
  });

  afterAll(async () => {
    const prisma = createTestPrisma();
    await cleanupTest(prisma, { customerIds });
    await prisma.$disconnect();

    await cleanupUser(tokens.email);
    await app.close();
  });

  // ─── POST /customer ───────────────────────────────────────────────────────

  describe('POST /api/v1/customer', () => {
    it('should create a customer and return 201 Created with response envelope', async () => {
      const email = `e2e-cust-${Date.now()}@example.com`;
      const res = await request(app.getHttpServer())
        .post('/api/v1/customer')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          firstName: 'Jane',
          lastName: 'Doe',
          email,
          phone: '1234567890',
          customerType: CustomerType.PERSONAL,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.email).toBe(email);

      customerIds.push(res.body.data.id);
    });

    it('should return 400 Bad Request on invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/customer')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'invalid-email',
          phone: '1234567890',
          customerType: CustomerType.PERSONAL,
        })
        .expect(400);
    });

    it('should return 401 Unauthorized without bearer token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/customer')
        .send({
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane.auth@example.com',
          phone: '1234567890',
          customerType: CustomerType.PERSONAL,
        })
        .expect(401);
    });
  });

  // ─── GET /customer ────────────────────────────────────────────────────────

  describe('GET /api/v1/customer', () => {
    it('should return 200 OK with array of customers', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/customer')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  // ─── GET /customer/:id ─────────────────────────────────────────────────────

  describe('GET /api/v1/customer/:id', () => {
    it('should return 200 OK with customer details', async () => {
      const customerId = customerIds[0];
      const res = await request(app.getHttpServer())
        .get(`/api/v1/customer/${customerId}`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(res.body.data.id).toBe(customerId);
    });

    it('should return 404 Not Found for non-existing customer', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/customer/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(404);
    });
  });

  // ─── PATCH /customer/:id ───────────────────────────────────────────────────

  describe('PATCH /api/v1/customer/:id', () => {
    it('should update customer properties successfully', async () => {
      const customerId = customerIds[0];
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/customer/${customerId}`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({ firstName: 'Jane Updated' })
        .expect(200);

      expect(res.body.data.firstName).toBe('Jane Updated');
    });
  });

  // ─── DELETE /customer/:id ──────────────────────────────────────────────────

  describe('DELETE /api/v1/customer/:id', () => {
    let tempCustomerId: string;

    beforeAll(async () => {
      const email = `e2e-cust-del-${Date.now()}@example.com`;
      const res = await request(app.getHttpServer())
        .post('/api/v1/customer')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          firstName: 'Delete',
          lastName: 'Me',
          email,
          phone: '0000000000',
          customerType: CustomerType.PERSONAL,
        });
      tempCustomerId = res.body.data.id;
    });

    it('should delete customer and return 200 OK', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/customer/${tempCustomerId}`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should return 404 after deletion', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/customer/${tempCustomerId}`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(404);
    });
  });
});
