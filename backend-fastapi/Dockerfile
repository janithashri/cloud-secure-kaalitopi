# Pin amd64 after moving Docker disk image (avoids exec format error on wrong arch layers)
FROM --platform=linux/amd64 python:3.11-slim

ENV PYTHONUNBUFFERED=1
WORKDIR /app

COPY requirements-core.txt ./
RUN pip install --no-cache-dir -r requirements-core.txt
COPY . .

ENV PYTHONPATH=/app

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
