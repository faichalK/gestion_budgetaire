# ─── Stage 1 : Build React ────────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /build/frontend

# Installer les dépendances Node (cache layer séparé)
COPY frontend/package*.json ./
RUN npm ci

# Copier le source et builder
# Vite outDir = ../backend/frontend_dist → /build/backend/frontend_dist
COPY frontend/ ./
RUN npm run build

# ─── Stage 2 : Application Django ─────────────────────────────────────────────
FROM python:3.10-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBUG=False

WORKDIR /app

# Dépendances Python
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Code backend
COPY backend/ ./backend/

# Script de création superuser
COPY create_superuser.py /app/backend/create_superuser.py

# Build React (depuis le stage 1)
COPY --from=frontend-builder /build/backend/frontend_dist ./backend/frontend_dist/

# Collecter les fichiers statiques pendant le build (pas au démarrage)
WORKDIR /app/backend
RUN SECRET_KEY=collectstatic-build-only python manage.py collectstatic --noinput

# Script de démarrage
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 8000

CMD ["/bin/sh", "/start.sh"]
