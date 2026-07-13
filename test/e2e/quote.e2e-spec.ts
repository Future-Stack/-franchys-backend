import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2EApp } from '../helpers/app.helper';
import {
  registerAndLogin,
  cleanupUser,
  seedTestCustomer,
  AuthTokens,
} from '../helpers/auth.helper';
import { createTestPrisma, cleanupTest } from '../setup/test-helpers';

// ─── E2E: Quote Endpoints ─────────────────────────────────────────────────────

describe('Quote (e2e)', () => {
  let app: INestApplication;
  let tokens: AuthTokens;
  let customerId: string;
  let cleanupCustomer: () => Promise<void>;
  const quoteIds: string[] = [];
  const jobIds: string[] = [];

  beforeAll(async () => {
    app = await createE2EApp();
    tokens = await registerAndLogin(app);

    const customer = await seedTestCustomer();
    customerId = customer.id;
    cleanupCustomer = customer.cleanup;
  });

  afterAll(async () => {
    // Clean up all created quotes and jobs from DB directly
    const prisma = createTestPrisma();
    await cleanupTest(prisma, { jobIds, quoteIds });
    await prisma.$disconnect();

    await cleanupCustomer();
    await cleanupUser(tokens.email);
    await app.close();
  });

  // ─── POST /quote ──────────────────────────────────────────────────────────

  describe('POST /api/v1/quote', () => {
    it('should create a quote and return 201 with quoteNumber', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/quote')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          customerId,
          repId: tokens.userId,
          taxRate: 7,
          lineItems: [
            {
              groupName: 'Group 1',
              description: 'T-Shirt',
              unitPrice: 20,
              markupPrice: 10,
              sizeM: 10,
              sizeL: 5,
              isTaxed: false,
              imprintType: 'Screen Print',
            },
          ],
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      const quote = res.body.data;
      expect(quote.id).toBeDefined();
      expect(quote.quoteNumber).toMatch(/^Q-\d+$/);
      expect(quote.status).toBe('DRAFT');

      quoteIds.push(quote.id);
    });

    it('should return 400 when required fields are missing', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/quote')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({ taxRate: 7 }) // missing customerId, repId, lineItems
        .expect(400);
    });

    it('should return 401 when no token is provided', async () => {
      await request(app.getHttpServer()).post('/api/v1/quote').send({}).expect(401);
    });
  });

  // ─── GET /quote ───────────────────────────────────────────────────────────

  describe('GET /api/v1/quote', () => {
    it('should return 200 with an array of quotes', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/quote')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should filter by status=DRAFT', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/quote?status=DRAFT')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(res.body.data.every((q: { status: string }) => q.status === 'DRAFT')).toBe(true);
    });
  });

  // ─── GET /quote/:id ───────────────────────────────────────────────────────

  describe('GET /api/v1/quote/:id', () => {
    it('should return 200 with the quote details', async () => {
      const quoteId = quoteIds[0];
      const res = await request(app.getHttpServer())
        .get(`/api/v1/quote/${quoteId}`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(res.body.data.id).toBe(quoteId);
      expect(res.body.data.lineItems).toBeDefined();
    });

    it('should return 404 for unknown id', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/quote/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(404);
    });
  });

  // ─── PATCH /quote/:id ─────────────────────────────────────────────────────

  describe('PATCH /api/v1/quote/:id', () => {
    it('should update notes and return 200', async () => {
      const quoteId = quoteIds[0];
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/quote/${quoteId}`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({ notes: 'Rush order — please prioritise' })
        .expect(200);

      expect(res.body.data.notes).toBe('Rush order — please prioritise');
    });
  });

  // ─── POST /quote/:id/approve ──────────────────────────────────────────────

  describe('POST /api/v1/quote/:id/approve', () => {
    it('should approve the quote and return status APPROVED (ADMIN bypasses permission check)', async () => {
      const quoteId = quoteIds[0];
      const res = await request(app.getHttpServer())
        .post(`/api/v1/quote/${quoteId}/approve`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(201);

      expect(res.body.data.status).toBe('APPROVED');

      // Collect auto-created job for cleanup
      const prisma = createTestPrisma();
      const jobs = await prisma.job.findMany({ where: { quoteId } });
      jobs.forEach((j) => jobIds.push(j.id));
      await prisma.$disconnect();
    });
  });

  // ─── DELETE /quote/:id ────────────────────────────────────────────────────

  describe('DELETE /api/v1/quote/:id', () => {
    let tempQuoteId: string;

    beforeAll(async () => {
      // Create a fresh quote to delete
      const res = await request(app.getHttpServer())
        .post('/api/v1/quote')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          customerId,
          repId: tokens.userId,
          lineItems: [{ description: 'Hat', unitPrice: 15, markupPrice: 5 }],
        });
      tempQuoteId = res.body.data.id;
    });

    it('should delete the quote and return 200', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/quote/${tempQuoteId}`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should return 404 after deletion', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/quote/${tempQuoteId}`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(404);
    });
  });
});
