FROM python:3.11-slim

WORKDIR /app

# Dépendances système minimales pour numpy + sentence-transformers
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Installer les dépendances Python
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copier le code
COPY backend/ ./backend/
COPY knowledge/ ./knowledge/

# Pré-télécharger le modèle + construire l'index au build time
RUN cd backend && python3 embed.py

WORKDIR /app/backend

EXPOSE 8080

CMD python3 -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}
