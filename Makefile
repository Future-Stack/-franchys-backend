IMAGE_NAME ?= shahidhasanshovu/francys-api:latest

up:
	@docker compose up -d

down:
	@docker compose down

restart:
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

bp:
	@docker build -t $(IMAGE_NAME) .
	@docker push $(IMAGE_NAME)

build-image:
	@docker build -t $(IMAGE_NAME) .

push-image:
	@docker push $(IMAGE_NAME)

pull-image:
	@docker pull $(IMAGE_NAME)

images:
	@docker images

gen:
	@npx prisma generate

push-db:
	@npx prisma db push

studio:
	@npx prisma studio

seed:
	@npm run seed

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

net:
	@netstat -ano | findstr :3000

net-db:
	@netstat -ano | findstr :5433
