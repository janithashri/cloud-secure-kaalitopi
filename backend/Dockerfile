FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=cloudsecure.settings.local

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
 && rm -rf /var/lib/apt/lists/*

# Install tfsec — Terraform/IaC static analysis scanner (Go binary, not a pip package)
RUN curl -L "https://github.com/aquasecurity/tfsec/releases/download/v1.28.11/tfsec-linux-amd64" \
    -o /usr/local/bin/tfsec \
    && chmod +x /usr/local/bin/tfsec

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
