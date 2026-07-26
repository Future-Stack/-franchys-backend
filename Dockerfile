# ── Stage 1: Build ───────────────────────────────────────────────────
FROM node:22-alpine AS builder

# Install build dependencies for native node-gyp modules and prisma
RUN apk add --no-cache libc6-compat openssl

WORKDIR /usr/src/app

# Copy package descriptors first to cache NPM layers
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci --legacy-peer-deps

# Copy Prisma schema folder and config file to generate Client
COPY prisma ./prisma
COPY prisma.config.ts ./

# Generate Prisma Client (builds JS query engine for alpine architecture)
RUN npx prisma generate

# Copy the rest of the application source code
COPY . .

# Build the NestJS application to /dist
RUN npm run build

# Compile database seed script to JS
RUN npx tsc prisma/seeds/index.ts --outDir dist/prisma/seeds --module commonjs --moduleResolution node --esModuleInterop true --skipLibCheck true

# Install only production dependencies and clear cache to keep image small
RUN npm prune --production --legacy-peer-deps && npm cache clean --force

# ── Stage 2: Runtime ─────────────────────────────────────────────────
FROM node:22-alpine AS runner

# Install openssl for prisma runtime
RUN apk add --no-cache openssl

WORKDIR /usr/src/app

ENV NODE_ENV=production

# Copy package configurations and node_modules from builder stage
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma
COPY --from=builder /usr/src/app/prisma.config.ts ./

# Expose NestJS default port
EXPOSE 3000

# Execute database schema sync, run seed script, and start the NestJS application
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && (node dist/prisma/seeds/index.js || true) && node dist/src/main.js"]
