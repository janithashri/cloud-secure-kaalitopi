up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build

migrate:
	docker compose exec backend python manage.py migrate

createsuperuser:
	docker compose exec backend python manage.py createsuperuser

logs:
	docker compose logs -f backend celery

shell:
	docker compose exec backend python manage.py shell

frontend-logs:
	docker compose logs -f frontend

