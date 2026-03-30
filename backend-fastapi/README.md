# FastAPI backend

This is a small FastAPI API and Celery worker alongside the Django backend. Both
use the existing PostgreSQL schema; Django migrations remain the schema source.

## Main pieces

- `app/core/config.py`: environment-backed settings and shared database URL.
- `app/db/repositories.py`: SQLAlchemy queries and transactions for providers,
  inventory runs, resource state, findings, and tenant lookup.
- `app/api/routers/providers.py`: tenant-scoped provider endpoints, connection
  checks, inventory run history, and queued inventory pulls.
- `worker/jobs/inventory/`: AWS resource discovery, fetchers, and state tracking.
- `worker/jobs/rule_engine/`: OPA policy evaluation for discovered resources.
- `worker/tasks.py`: Celery task lifecycle for inventory runs and the periodic
  schedule.

## Local run

From the repository root, start PostgreSQL, Valkey, and OPA with the existing
Compose file, then run Django migrations from `backend/` before using the API.
The Compose file already points the API and Celery services at this directory.

The API listens on port 8000. Provider routes use the existing DRF token format:
`Authorization: Token <key>`.
