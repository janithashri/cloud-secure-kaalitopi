DC=docker-compose

up:
	$(DC) up -d

down:
	$(DC) down

build:
	$(DC) build

rebuild:
	$(DC) up -d --build

migrate:
	$(DC) exec backend python manage.py migrate

createsuperuser:
	$(DC) exec backend python manage.py createsuperuser

logs:
	$(DC) logs -f backend celery

shell:
	$(DC) exec backend python manage.py shell

frontend-logs:
	$(DC) logs -f frontend

all-logs:
	$(DC) logs -f

restart:
	$(DC) down && $(DC) up -d
