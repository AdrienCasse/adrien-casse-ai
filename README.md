# Adrien Casse AI — Personal RAG Chatbot

Chatbot public qui répond à des questions sur Adrien Casse — Data Scientist Junior basé à Paris. Parle de lui à la troisième personne, avec précision et honnêteté. Conçu pour les recruteurs, les contacts professionnels, ou simplement les curieux.

**Live** : [adrien-casse-rag.vercel.app](https://adrien-casse-rag.vercel.app)

---

## Architecture RAG

```
╔══════════════════════════════════════════════════════════════╗
║                   BUILD TIME  (image Docker)                 ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║   knowledge/*.md  ──►  embed.py                             ║
║   (7 fichiers)         │                                    ║
║                        ├─ découpe en chunks ~400 chars      ║
║                        ├─ fastembed  →  vecteurs 384 dims   ║
║                        ├─ embeddings.npy   (57 × 384)       ║
║                        └─ chunks.json      (57 passages)    ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
                           ↓ figé dans l'image ↓
╔══════════════════════════════════════════════════════════════╗
║                   RUNTIME  (Railway / FastAPI)               ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  [1] Question utilisateur                                    ║
║      "Pourquoi Adrien cherche un nouveau poste ?"            ║
║                        │                                    ║
║                        ▼                                    ║
║  [2] Embedding question                                      ║
║      fastembed  →  [ 0.12, -0.34, 0.89, … ]  (384 dims)    ║
║                        │                                    ║
║                        ▼                                    ║
║  [3] Recherche sémantique                                    ║
║      cosine similarity  vs  embeddings.npy                  ║
║      → score pour chacun des 57 chunks                      ║
║      → top-4 passages les plus proches                      ║
║                        │                                    ║
║                        ▼                                    ║
║  [4] Injection dans le prompt                                ║
║      system prompt = persona Adrien                         ║
║                    + règles (3ème personne, anti-répétition) ║
║                    + [chunk faq.md] [chunk parcours.md] …   ║
║                        │                                    ║
║                        ▼                                    ║
║  [5] Groq API  →  Llama 3.3 70B  (70 milliards paramètres) ║
║      température 0.7 · max 600 tokens · ~300ms              ║
║                        │                                    ║
║                        ▼                                    ║
║  [6] Réponse  →  Next.js  →  Utilisateur                    ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝

  Pourquoi le RAG ?  Le modèle ne "connaît" pas Adrien par défaut.
  À chaque question, les passages pertinents sont injectés dans le
  prompt — le LLM répond uniquement à partir de ces extraits.
  Résultat : réponses précises, ancrées dans des faits réels.
```

---

## Stack

| Couche | Techno | Pourquoi |
|--------|--------|----------|
| Embedding | `fastembed` (BAAI/bge-small-en-v1.5, 384 dims) | ONNX runtime — pas de PyTorch, image Docker ~150MB |
| Vector search | NumPy dot product (cosine similarity) | 57 chunks — pas besoin de FAISS |
| LLM | Llama 3.3 70B via [Groq](https://groq.com) | Gratuit (14 400 req/jour), ultra-rapide grâce aux LPU |
| Backend | FastAPI + Python 3.11 | Async, Pydantic, auto-doc Swagger |
| Frontend | Next.js 14 | App Router, CSS variables, Google Fonts |
| Deploy backend | Railway | Auto-deploy depuis GitHub, Dockerfile |
| Deploy frontend | Vercel | Auto-deploy depuis `frontend/`, alias custom |

---

## Qu'est-ce que Groq ?

Groq n'est pas un modèle — c'est une **infrastructure d'inférence ultra-rapide** basée sur des puces LPU (Language Processing Unit) conçues spécifiquement pour faire tourner des LLMs. Groq héberge des modèles open-source (Llama, Mixtral, Gemma...) et les sert via API à des vitesses très supérieures à OpenAI ou Anthropic sur les mêmes modèles.

Pour ce projet : tier gratuit, 14 400 requêtes/jour, latence ~300ms pour 600 tokens — largement suffisant pour un portfolio.

---

## Base de connaissance

7 fichiers Markdown dans `knowledge/` :

| Fichier | Contenu |
|---------|---------|
| `moi.md` | Identité, Maurice, Paris, parcours de vie |
| `parcours.md` | Formation (M2 Lyon 2) + expériences (C-Ways, Fretly) |
| `projets.md` | Projets GitHub avec données réelles |
| `stack.md` | Compétences techniques honnêtes |
| `valeurs.md` | Ce qui motive Adrien, sa vision de la data |
| `humain.md` | Personnalité, passions, ce qui le construit |
| `faq.md` | Réponses pré-construites aux questions recruteurs |

---

## Sécurité

- **CORS** restreint à `adrien-casse-rag.vercel.app`
- **Rate limiting** : 20 requêtes/IP/heure (in-memory)
- **Validation inputs** : max 500 caractères, détection prompt injection
- **Historique sanitisé** : tronqué à 6 tours, contenu limité
- **Analytics anonymisées** : IP hashée SHA-256, stockée en SQLite

---

## Installation locale

### Prérequis

```bash
# Python 3.11+
# Node.js 18+
```

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Construire l'index d'embeddings depuis la base de connaissance
python embed.py

# Lancer l'API
uvicorn main:app --reload --port 8002
```

### Frontend

```bash
cd frontend
npm install
npm run dev  # port 3000
```

### Variables d'environnement

```bash
# backend/.env
GROQ_API_KEY=gsk_...   # Gratuit sur console.groq.com
```

```bash
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8002
```

---

## Endpoints API

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/health` | Statut + nombre de chunks en mémoire |
| `POST` | `/chat` | Envoie un message, reçoit une réponse RAG |
| `GET` | `/stats` | Analytics anonymisées (questions, tokens, sessions) |
| `GET` | `/docs` | Documentation Swagger auto-générée |

---

## Déploiement

**Backend → Railway**
```bash
# Auto-deploy sur push GitHub (Dockerfile à la racine)
# Variable d'env GROQ_API_KEY à configurer dans Railway dashboard
```

**Frontend → Vercel**
```bash
cd frontend
vercel --prod
vercel alias set <url-générée> adrien-casse-rag.vercel.app
```

---

Construit par [Adrien Casse](https://github.com/AdrienCasse) · Data Scientist · Paris
