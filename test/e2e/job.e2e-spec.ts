import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2EApp } from '../helpers/app.helper';
import { registerAndLogin, cleanupUser, AuthTokens } from '../helpers/auth.helper';
import { createTestPrisma, cleanupTest } from '../setup/test-helpers';

// ─── E2E: Job Endpoints ───────────────────────────────────────────────────────

describe('Job (e2e)', () => {
  let app: INestApplication;
  let tokens: AuthTokens;
  const jobIds: string[] = [];

  beforeAll(async () => {
    app = await createE2EApp();
    tokens = await registerAndLogin(app);
  });

  afterAll(async () => {
    const prisma = createTestPrisma();
    await cleanupTest(prisma, { jobIds });
    await prisma.$disconnect();

    await cleanupUser(tokens.email);
    await app.close();
  });

  // ─── POST /job ────────────────────────────────────────────────────────────

  describe('POST /api/v1/job', () => {
    it('should create a job and return 201', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/job')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          jobId: `Q-E2E-${Date.now()}`,
          clientName: 'Acme Corp',
          description: 'T-Shirts (50 units)',
          dueDate: '2026-12-01',
          amount: 1500,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.status).toBe('QUOTE');

      jobIds.push(res.body.data.id);
    });

    it('should return 400 when required fields are missing', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/job')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({ clientName: 'Incomplete' })
        .expect(400);
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).post('/api/v1/job').send({}).expect(401);
    });
  });

  // ─── GET /job ─────────────────────────────────────────────────────────────

  describe('GET /api/v1/job', () => {
    it('should return 200 with array of jobs', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/job')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should filter by status=QUOTE', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/job?status=QUOTE')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(res.body.data.every((j: { status: string }) => j.status === 'QUOTE')).toBe(true);
    });
  });

  // ─── GET /job/:id ─────────────────────────────────────────────────────────

  describe('GET /api/v1/job/:id', () => {
    it('should return 200 with job details', async () => {
      const jobId = jobIds[0];
      const res = await request(app.getHttpServer())
        .get(`/api/v1/job/${jobId}`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(res.body.data.id).toBe(jobId);
      expect(res.body.data.clientName).toBe('Acme Corp');
    });

    it('should return 404 for unknown id', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/job/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(404);
    });
  });

  // ─── PATCH /job/:id/status ────────────────────────────────────────────────

  describe('PATCH /api/v1/job/:id/status', () => {
    it('should update job status and return 200', async () => {
      const jobId = jobIds[0];
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/job/${jobId}/status`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({ status: 'APPROVED' })
        .expect(200);

      expect(res.body.data.status).toBe('APPROVED');
    });

    it('should return 400 for invalid status value', async () => {
      const jobId = jobIds[0];
      await request(app.getHttpServer())
        .patch(`/api/v1/job/${jobId}/status`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({ status: 'INVALID_STATUS' })
        .expect(400);
    });
  });

  // ─── DELETE /job/:id ──────────────────────────────────────────────────────

  describe('DELETE /api/v1/job/:id', () => {
    let tempJobId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/job')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          jobId: `Q-E2E-DEL-${Date.now()}`,
          clientName: 'Delete Corp',
          description: 'To be deleted',
          dueDate: '2026-11-01',
          amount: 100,
        });
      tempJobId = res.body.data.id;
    });

    it('should delete job and return 200', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/job/${tempJobId}`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('should return 404 after deletion', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/job/${tempJobId}`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(404);
    });
  });
});
