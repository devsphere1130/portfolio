# DevSphere API — Django + DRF.
#   dev:  docker compose up            (runserver, source mounted from the host)
#   prod: docker build --target prod . (gunicorn, code baked in, non-root, no secrets in the image)

FROM python:3.14-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /app
RUN groupadd --system app && useradd --system --gid app --home-dir /app --shell /usr/sbin/nologin app
COPY requirements.txt .
RUN pip install -r requirements.txt
# The media directory exists and belongs to the app user, so a named volume mounted here is writable.
RUN mkdir -p /app/media /app/staticfiles && chown -R app:app /app

# ---------------------------------------------------------------------------
FROM base AS dev
USER app
EXPOSE 8000
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

# ---------------------------------------------------------------------------
FROM base AS prod
ENV DJANGO_ENV=production
COPY --chown=app:app . .
# collectstatic needs settings to import; these throwaway values are for the build step only.
# DJANGO_ENV=development only for this build step (the running container is production via compose/env).
RUN DJANGO_ENV=development DJANGO_SECRET_KEY=build-only DATABASE_URL=postgres://build:build@localhost:5432/build \
    python manage.py collectstatic --noinput
USER app
EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5   CMD python -c "import os, urllib.request; urllib.request.urlopen(f'http://127.0.0.1:{os.environ.get(\"PORT\", \"8000\")}/api/health/', timeout=4)"
# Migrations are NOT run by default: run them deliberately, e.g.
#   docker compose -f compose.prod.yaml run --rm backend python manage.py migrate
# Hosts without a release step (e.g. Render's free plan) can set MIGRATE_ON_START=1 instead.
# PORT (Render, Railway, Cloud Run...) and WEB_CONCURRENCY are read from the environment.
CMD ["sh", "-c", "if [ \"$MIGRATE_ON_START\" = 1 ]; then python manage.py migrate --noinput && python manage.py createcachetable; fi && exec gunicorn portfolio_api.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers ${WEB_CONCURRENCY:-2} --timeout 60 --graceful-timeout 30 --access-logfile - --error-logfile - --forwarded-allow-ips '*'"]
