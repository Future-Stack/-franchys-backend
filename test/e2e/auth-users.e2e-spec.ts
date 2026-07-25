import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2EApp } from '../helpers/app.helper';
import {
  registerAndLogin,
  cleanupUser,
  AuthTokens,
} from '../helpers/auth.helper';
import { createTestPrisma, cleanupTest } from '../setup/test-helpers';

describe('Auth & Users (e2e)', () => {
  let app: INestApplication;
  let tokens: AuthTokens;
  const createdEmails: string[] = [];
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    app = await createE2EApp();
    tokens = await registerAndLogin(app);
  });

  afterAll(async () => {
    const prisma = createTestPrisma();
    await cleanupTest(prisma, { userIds: createdUserIds });
    await prisma.$disconnect();

    for (const email of createdEmails) {
      await cleanupUser(email);
    }
    await cleanupUser(tokens.email);
    await app.close();
  });

  // ─── POST /auth/register ──────────────────────────────────────────────────

  describe('POST /api/v1/auth/register', () => {
    it('should register successfully and verify automatically in test environment', async () => {
      const email = `e2e-reg-lifecycle-${Date.now()}@test.com`;
      createdEmails.push(email);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: 'Jane E2E',
          email,
          password: 'Password123!',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Registration successful');
    });

    it('should return 409 Conflict if registering duplicate email', async () => {
      const email = `e2e-reg-dup-${Date.now()}@test.com`;
      createdEmails.push(email);

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: 'Original Jane',
          email,
          password: 'Password123!',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: 'Duplicate Jane',
          email,
          password: 'Password123!',
        })
        .expect(409);
    });
  });

  // ─── POST /users/admin ────────────────────────────────────────────────────

  describe('POST /api/v1/users/admin', () => {
    it('should create a new admin with permissions (restricted to ADMIN)', async () => {
      const email = `e2e-admin-create-${Date.now()}@test.com`;
      createdEmails.push(email);

      const res = await request(app.getHttpServer())
        .post('/api/v1/users/admin')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          name: 'New Admin',
          email,
          password: 'Password123!',
          permissions: { canApproveQuotes: true },
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('ADMIN');
      expect(res.body.data.permissions.canApproveQuotes).toBe(true);

      createdUserIds.push(res.body.data.userId);
    });

    it('should return 400 Bad Request on missing fields', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users/admin')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({ name: 'Admin Mod' })
        .expect(400);
    });
  });

  // ─── GET /users/admins ────────────────────────────────────────────────────

  describe('GET /api/v1/users/admin', () => {
    it('should return paginated lists of administrators', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users/admin?page=1&limit=5')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(5);
    });
  });

  // ─── PATCH /users/admin/:id ───────────────────────────────────────────────

  describe('PATCH /api/v1/users/admin/:id', () => {
    it('should update admin properties and permissions successfully', async () => {
      // Create admin first
      const email = `e2e-admin-patch-${Date.now()}@test.com`;
      createdEmails.push(email);

      const createRes = await request(app.getHttpServer())
        .post('/api/v1/users/admin')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          name: 'Patch Admin',
          email,
          password: 'Password123!',
          permissions: { canApproveQuotes: false },
        });

      const adminId = createRes.body.data.userId;
      createdUserIds.push(adminId);

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/users/admin/${adminId}`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          name: 'Patched Name',
          permissions: { canApproveQuotes: true },
        })
        .expect(200);

      expect(res.body.data.name).toBe('Patched Name');
      expect(res.body.data.permissions.canApproveQuotes).toBe(true);
    });
  });

  // ─── POST /users/admin/:id/ban ────────────────────────────────────────────

  describe('POST /api/v1/users/admin/:id/ban', () => {
    it('should suspend status of admin successfully', async () => {
      const email = `e2e-admin-ban-${Date.now()}@test.com`;
      createdEmails.push(email);

      const createRes = await request(app.getHttpServer())
        .post('/api/v1/users/admin')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          name: 'Ban Admin',
          email,
          password: 'Password123!',
          permissions: { canApproveQuotes: false },
        });

      const adminId = createRes.body.data.userId;
      createdUserIds.push(adminId);

      const res = await request(app.getHttpServer())
        .post(`/api/v1/users/admin/${adminId}/ban`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(201); // NestJS POST default

      expect(res.body.data.status).toBe('SUSPEND');
    });
  });

  // ─── PATCH /users/:id/role ────────────────────────────────────────────────

  describe('PATCH /api/v1/users/:id/role', () => {
    it('should update role of a user successfully', async () => {
      const email = `e2e-user-role-${Date.now()}@test.com`;
      createdEmails.push(email);

      const createRes = await request(app.getHttpServer())
        .post('/api/v1/users/admin')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          name: 'Role Test Admin',
          email,
          password: 'Password123!',
        });

      const userId = createRes.body.data.userId;
      createdUserIds.push(userId);

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/users/${userId}/role`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({ role: 'SUPER_ADMIN' })
        .expect(200);

      expect(res.body.data.role).toBe('SUPER_ADMIN');
    });
  });
});
