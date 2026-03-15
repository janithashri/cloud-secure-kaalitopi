import os
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "cloudsecure.settings")
app = Celery("cloudsecure")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks(["tasks"])
