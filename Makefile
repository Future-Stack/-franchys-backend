ps:
  @docker ps

cps:
  @docker compose ps

logs:
  @echo "docker compose logs -f"
  @docker compose logs -f
	
down:
  @echo "docker compose down"
  @echo "Stopping all services..."
  @docker compose down

bp:
  @docker build -t shahidhasanshovu/francys-api:latest .
  @docker push shahidhasanshovu/francys-api:latest

up:
  @echo "docker compose up -d"
  @echo "Starting all services..."
  @docker compose up -d

restart:
  @docker restart francys_api

bash:
  @docker exec -it francys_api bash

images:
  @docker images

pull:
  @docker pull shahidhasanshovu/francys-api:latest

push:
  @docker push shahidhasanshovu/francys-api:latest

mm:
  @docker exec -it francys_api python manage.py makemigrations

m:
  @docker exec -it francys_api python manage.py migrate

mig:
  @docker exec francys_api python manage.py makemigrations subscription
  @docker exec francys_api python manage.py migrate

sm:
  @docker exec -it francys_api python manage.py showmigrations

net:
  @netstat -ano | findstr :9000

all: down up logs


