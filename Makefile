.PHONY: help install embed dev-backend dev-frontend health stats deploy force-deploy

# ── Variables ──────────────────────────────────────────────────────────────────
BACKEND_PORT   ?= 8002
FRONTEND_PORT  ?= 3002
RAILWAY_URL    ?= $(shell cat .railway-url 2>/dev/null || echo "https://<your-railway-url>")

# ── Default ────────────────────────────────────────────────────────────────────
help:
	@echo ""
	@echo "  adrien-casse-ai — commandes disponibles"
	@echo ""
	@echo "  Setup"
	@echo "    make install          Installe les dépendances Python + Node"
	@echo "    make embed            Rebuild les embeddings depuis knowledge/*.md"
	@echo ""
	@echo "  Développement local"
	@echo "    make dev-backend      Lance le backend FastAPI (port $(BACKEND_PORT))"
	@echo "    make dev-frontend     Lance le frontend Next.js (port $(FRONTEND_PORT))"
	@echo ""
	@echo "  Monitoring"
	@echo "    make health           Vérifie que le backend est up + nb de chunks"
	@echo "    make stats            Affiche les stats analytics (questions, tokens...)"
	@echo ""
	@echo "  Déploiement"
	@echo "    make deploy           git push → Railway + Vercel auto-déploient"
	@echo "    make force-deploy     Commit vide pour forcer le redeploy Railway"
	@echo ""

# ── Setup ──────────────────────────────────────────────────────────────────────
install:
	@echo "→ Installation Python (backend)..."
	cd backend && python3 -m pip install -r requirements.txt
	@echo "→ Installation Node (frontend)..."
	cd frontend && npm install
	@echo "✓ Dépendances installées"
	@echo ""
	@echo "  Prochaine étape :"
	@echo "    cp backend/.env.example backend/.env  # puis renseigner GROQ_API_KEY"
	@echo "    make embed"

embed:
	@echo "→ Rebuild embeddings depuis knowledge/*.md..."
	cd backend && python3 embed.py
	@echo "✓ Embeddings reconstruits — penser à git add backend/data/ && git commit"

# ── Dev ────────────────────────────────────────────────────────────────────────
dev-backend:
	@echo "→ Backend FastAPI sur http://localhost:$(BACKEND_PORT)"
	@echo "  Docs : http://localhost:$(BACKEND_PORT)/docs"
	cd backend && uvicorn main:app --reload --port $(BACKEND_PORT)

dev-frontend:
	@echo "→ Frontend Next.js sur http://localhost:$(FRONTEND_PORT)"
	cd frontend && npm run dev

# ── Monitoring ─────────────────────────────────────────────────────────────────
health:
	@echo "→ Health check backend..."
	@curl -s $(RAILWAY_URL)/health | python3 -m json.tool || \
		curl -s http://localhost:$(BACKEND_PORT)/health | python3 -m json.tool

stats:
	@echo "→ Analytics backend..."
	@curl -s $(RAILWAY_URL)/stats | python3 -m json.tool || \
		curl -s http://localhost:$(BACKEND_PORT)/stats | python3 -m json.tool

# ── Déploiement ────────────────────────────────────────────────────────────────
deploy:
	@echo "→ Push vers main (Railway + Vercel auto-déploient)..."
	git push origin main
	@echo "✓ Push envoyé — Railway rebuilde ~3-5min, Vercel ~1-2min"

force-deploy:
	@echo "→ Commit vide pour forcer le redeploy Railway..."
	git commit --allow-empty -m "chore : force redeploy Railway"
	git push origin main
	@echo "✓ Redeploy forcé"
