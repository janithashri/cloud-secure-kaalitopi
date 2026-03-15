@echo off
REM Windows: bind to 127.0.0.1 and use --noreload (avoids hanging on 0.0.0.0)
REM If port 8000 still hangs, try: python manage.py runserver 127.0.0.1:8001 --noreload
python manage.py runserver 127.0.0.1:8000 --noreload
