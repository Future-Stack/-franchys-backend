import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createE2EApp } from '../helpers/app.helper';
import {
  registerAndLogin,
  cleanupUser,
  AuthTokens,
} from '../helpers/auth.helper';

// ─── E2E: Auth Endpoints ─────────────────────────────────────────────────────
// Tests the full HTTP layer: validation pipe, response envelope, status codes.

describe('Auth (e2e)', () => {
  let app: INestApplication;
  const createdEmails: string[] = [];

  beforeAll(async () => {
    app = await createE2EApp();
  });

  afterAll(async () => {
    for (const email of createdEmails) {
      await cleanupUser(email);
    }
    await app.close();
  });

  // ─── POST /auth/register ────────────────────────────────────────────────────

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user and return 201', async () => {
      const email = `e2e-reg-${Date.now()}@test.com`;
      createdEmails.push(email);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ name: 'Test User', email, password: 'Test@12345' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
    });

    it('should return 409 when email already exists', async () => {
      const email = `e2e-dup-${Date.now()}@test.com`;
      createdEmails.push(email);

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ name: 'First', email, password: 'Test@12345' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ name: 'Second', email, password: 'Test@12345' })
        .expect(409);
    });

    it('should return 400 when body is invalid', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ name: 'Missing Email' })
        .expect(400);
    });
  });

  // ─── POST /auth/login ───────────────────────────────────────────────────────

  describe('POST /api/v1/auth/login', () => {
    let tokens: AuthTokens;
    let userEmail: string;

    beforeAll(async () => {
      tokens = await registerAndLogin(app);
      userEmail = tokens.email;
      createdEmails.push(userEmail);
    });

    it('should return accessToken and refreshToken on valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: userEmail, password: 'Test@12345' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
    });

    it('should return 401 on wrong password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: userEmail, password: 'WrongPass!' })
        .expect(401);
    });

    it('should return 401 on unknown email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@nowhere.com', password: 'Test@12345' })
        .expect(401);
    });
  });

  // ─── Protected route — 401 without token ───────────────────────────────────

  describe('Protected route guard', () => {
    it('should return 401 when no Authorization header is sent', async () => {
      await request(app.getHttpServer()).get('/api/v1/quote').expect(401);
    });
  });
});
