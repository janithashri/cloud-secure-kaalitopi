# Local dev checklist (Windows)

## 1. Environment

- **.env** must be in project root: `kaali-topi/cloudsecure/.env` (or a copy in `backend/.env`).
- **POSTGRES_HOST=localhost** when running Django on your PC (use `db` only in Docker).
- Start the server from **backend/** so `manage.py` finds the project root and loads `.env`.

## 2. Run the server (Windows)

From **backend/** with venv activated:

```bat
python manage.py runserver 127.0.0.1:8000 --noreload
```

Or double‑click **runserver.bat** (run from backend folder).

- **127.0.0.1** avoids some Windows issues with `0.0.0.0`.
- **--noreload** avoids the dev server hanging on Windows.

If 8000 still hangs, try another port:

```bat
python manage.py runserver 127.0.0.1:8001 --noreload
```

Then open: http://127.0.0.1:8001/health/

## 3. Check that requests reach Django

When you open http://127.0.0.1:8000/health/ you should see in the **runserver terminal**:

```
[REQUEST] GET /health/
```

- If you **never** see `[REQUEST]` for your URL, the browser is not reaching Django (firewall, wrong port, or another app on 8000).
- If you **do** see `[REQUEST]` but the browser keeps loading, something after the middleware (e.g. view or DB) is blocking.

## 4. URLs to test

| URL | Expect |
|-----|--------|
| http://127.0.0.1:8000/health/ | `{"status":"ok",...}` immediately, no DB |
| http://127.0.0.1:8000/debug-db/ | `{"status":"ok","db":"connected"}` or error |
| http://127.0.0.1:8000/admin/ | Django admin login |

## 5. Verifying an inventory scan (Run scan)

After clicking **Run scan** in the app:

1. **Celery worker must be running** or the task never runs (it stays queued). In a separate terminal from the backend folder with venv activated (use `--pool=solo` on Windows to avoid worker crashes):
   ```bat
   celery -A cloudsecure worker -Q inventory -l info --pool=solo
   ```
   You should see the task picked up and logs like: `Processing account 123456789012`, `Account ... found X resources in Y pages`.

2. **Providers page — Last scan column**  
   The table now has a **Last scan** column. After you click Run scan, refresh or wait a few seconds; you should see **Running…** then **completed** (or **failed**) with resource counts. While running, the page polls every 5 seconds.

3. **Django admin**  
   Open http://127.0.0.1:8001/admin/ → **Auth Token** section → **Inventory runs**. You can see each run’s state (`running` / `completed` / `partial` / `failed`), `started_at`, `completed_at`, and `stats` (total, new, changed, deleted, etc.).

4. **API**  
   With your auth token, call:
   ```text
   GET /api/v1/providers/<provider_id>/inventory-runs/
   ```
   Returns the last 10 runs with `state`, `started_at`, `completed_at`, `stats`.

5. **Neo4j**  
   The scan writes to Neo4j. If Neo4j isn’t running or isn’t reachable (see `.env`: `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`), the task may fail. Stats (total, new, changed) are still stored on the `InventoryRun` in Django.

6. **AWS Resource Explorer**  
   The account must have Resource Explorer enabled with an **AGGREGATOR** index. If not, the task fails with a configuration error (visible in Celery logs and in the run’s `stats.error` in admin).

## 6. If it still only loads

- Allow **Python** through Windows Firewall for **Private** networks (port 8000 or 8001).
- Close other apps that might use port 8000; try port **8001** as above.
- From PowerShell: `Invoke-WebRequest -Uri http://127.0.0.1:8001/health/ -UseBasicParsing` — if this times out, the server is not responding on this machine.
