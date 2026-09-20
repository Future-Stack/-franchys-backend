# =============================================================================
# Francys (MAK SERVI) Backend - Project Automation Makefile
# =============================================================================

.PHONY: help up down restart logs logs-all ps bash db-bash gen push-db studio test test-watch build lint dev seed net

help:
	@echo "Francys Backend Management Commands:"
	@echo "  make up          - Start all Docker services in background"
	@echo "  make down        - Stop all Docker services"
	@echo "  make restart     - Restart the API container"
	@echo "  make logs        - Follow API container logs"
	@echo "  make logs-all    - Follow logs for all services"
	@echo "  make ps          - View running containers"
	@echo "  make bash        - Open shell in API container"
	@echo "  make db-bash     - Open psql shell in PostgreSQL container"
	@echo "  make gen         - Generate Prisma client (multi-file schema)"
	@echo "  make push-db     - Push Prisma schema to PostgreSQL database"
	@echo "  make studio      - Open Prisma Studio GUI"
	@echo "  make dev         - Start NestJS development server locally"
	@echo "  make build       - Compile NestJS production build"
	@echo "  make test        - Run unit test suite"
	@echo "  make lint        - Run ESLint fixes"
	@echo "  make net         - Check if port 3000 is in use"

# ─── Docker Compose Services ──────────────────────────────────────────────────

up:
	@echo "Starting Francys containers..."
	@docker compose up -d

down:
	@echo "Stopping Francys containers..."
	@docker compose down

restart:
	@echo "Restarting Francys API container..."
	@docker restart francys_api

logs:
	@docker compose logs -f api

logs-all:
	@docker compose logs -f

ps:
	@docker compose ps

bash:
	@docker exec -it francys_api sh

db-bash:
	@docker exec -it francys_postgres psql -U postgres -d mydb

# ─── Prisma & Database ────────────────────────────────────────────────────────

gen:
	@echo "Generating Prisma Client from multi-file schemas..."
	@npx prisma generate

push-db:
	@echo "Synchronizing Prisma schema with database..."
	@npx prisma db push

studio:
	@npx prisma studio

seed:
	@npm run seed

# ─── Local Development & Testing ──────────────────────────────────────────────

dev:
	@npm run start:dev

build:
	@npm run build

test:
	@npm run test

test-watch:
	@npm run test:watch

lint:
	@npm run lint

# ─── Port Utilities (Windows) ─────────────────────────────────────────────────

net:
	@netstat -ano | findstr :3000

net-db:
	@netstat -ano | findstr :5433
