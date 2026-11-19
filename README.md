```
# ── App ────────────────────────────────
NODE_ENV=development
APP_PORT=3000
API_PREFIX=api/v1
HOST_PORT=3001

# ── Database ───────────────────────────
POSTGRES_USER=postgres
POSTGRES_PASSWORD=changeme
POSTGRES_DB=mydb
POSTGRES_HOST_PORT=5433
DATABASE_URL=postgresql://postgres:changeme@localhost:5433/mydb?schema=public

# ── Redis ──────────────────────────────
REDIS_HOST=localhost
REDIS_PORT=6380
REDIS_HOST_PORT=6380

# ── JWT ────────────────────────────────
JWT_SECRET=super_secret_change_in_production
JWT_EXPIRES_IN=7d
```
