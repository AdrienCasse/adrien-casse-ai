# CLAUDE.md — adrien-casse-ai

## Intention du projet

Ce projet est un **outil de différenciation professionnelle**. Il permet aux recruteurs, managers, et contacts de la data d'explorer le profil d'Adrien Casse via un chatbot RAG public — une façon active et mémorable de présenter un profil junior.

L'objectif n'est pas de paraître ce qu'Adrien n'est pas. C'est de montrer, de façon honnête et précise, ce qu'il sait faire, ce qu'il a livré en production, et ce qui le distingue d'un junior standard. La base de connaissance est le coeur du projet — elle doit être vraie, dense, et orientée impact.

**Live** : [adrien-casse-rag.vercel.app](https://adrien-casse-rag.vercel.app)

---

## Architecture

```
Utilisateur
    ↓ HTTPS
Vercel — Next.js 14 (frontend/)
    ↓ POST /chat
Railway — FastAPI Python 3.11 (backend/)
    ├─ fastembed: embed la question (BAAI/bge-small-en-v1.5, 384 dims, ONNX)
    ├─ NumPy cosine similarity sur 57 chunks (embeddings.npy + chunks.json)
    ├─ Top-4 chunks → injectés dans le system prompt
    └─ Groq API (Llama 3.3 70B) → réponse en 3ème personne
```

**Fichiers critiques :**

| Fichier | Rôle |
|---------|------|
| `backend/main.py` | API FastAPI — pipeline RAG, sécurité, analytics |
| `backend/embed.py` | Script one-shot — chunking + embedding des .md |
| `backend/data/embeddings.npy` | Vecteurs pré-calculés (build time) |
| `backend/data/chunks.json` | Chunks textuels avec source |
| `knowledge/*.md` | Base de connaissance — le coeur du projet |
| `frontend/app/page.tsx` | Interface chat React (CSR, pas de SSR) |
| `frontend/app/layout.tsx` | Métadonnées OpenGraph |
| `Dockerfile` | Build Railway — embed.py exécuté à build time |

---

## Base de connaissance — règles absolues

**C'est la seule chose qui distingue ce chatbot d'un jouet.** Chaque modification doit respecter :

1. **Vrai uniquement** — ne rien inventer, ne pas exagérer. Si une information est incertaine, ne pas l'ajouter.
2. **Orienté impact** — préférer "livré un pipeline GCP en production" à "compétence GCP".
3. **Granulaire** — les chunks font ~400 chars. Une idée dense par paragraphe, pas de listes à rallonge.
4. **Honnête sur les limites** — les gaps techniques d'Adrien sont dans `stack.md`, les garder à jour.
5. **3ème personne** — les .md sont rédigés pour le system prompt, pas pour être lus directement.

**Fichiers de connaissance :**
- `moi.md` — identité, Maurice, parcours de vie, langues
- `parcours.md` — formation M2 Lyon 2, Fretly, C-Ways stage + CDI
- `stack.md` — compétences honnêtes (quotidiennes / peut utiliser / lacunes assumées)
- `projets.md` — projets GitHub avec métriques réelles
- `humain.md` — personnalité, passions, ce qui le construit
- `valeurs.md` — motivations, vision de la data, ce qu'il refuse
- `faq.md` — réponses pré-construites aux questions recruteurs typiques

**Après toute modification d'un .md : rebuild les embeddings.**

```bash
cd backend && python3 embed.py
# Vérifie: "Embeddings calculés: X chunks"
git add backend/data/ knowledge/
git commit -m "feat(knowledge) : <sujet>"
git push  # Railway redéploie automatiquement
```

---

## Persona du chatbot — règles inviolables

Définies dans le system prompt de `backend/main.py` (ligne ~80) :

- **3ème personne obligatoire** — "Adrien a livré..." jamais "Je suis..."
- **Précis ou honnête** — si l'info n'est pas dans les chunks, dire clairement que ce n'est pas documenté
- **Anti-répétition stricte** — ne jamais reformuler la même phrase dans une conversation
- **Jamais de superlatifs vides** — pas "exceptionnel talent", pas "passionné par la data" sans contexte concret
- **Salaire : 45–50k EUR** — ne pas dévier, ne pas négocier dans le chat

---

## Développement local

### Backend

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # renseigner GROQ_API_KEY
python3 embed.py      # obligatoire au premier setup
uvicorn main:app --reload --port 8002
```

**Health check** : `GET http://localhost:8002/health`  
**Analytics** : `GET http://localhost:8002/stats`  
**API doc** : `http://localhost:8002/docs`

### Frontend

```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8002" > .env.local
npm run dev  # port 3002
```

---

## Déploiement

### Backend → Railway

Railway auto-déploie sur `git push` (branch `main`).  
Le Dockerfile exécute `python3 embed.py` au build — les embeddings sont figés dans l'image.

**Forcer un redéploiement sans changement de code :**
```bash
git commit --allow-empty -m "chore : force redeploy Railway"
git push
```

**Variable d'environnement requise sur Railway :** `GROQ_API_KEY`

### Frontend → Vercel

Vercel auto-déploie sur `git push` depuis le dossier `frontend/`.

**Variable d'environnement requise sur Vercel :** `NEXT_PUBLIC_API_URL=https://<railway-url>`

---

## Sécurité — ne pas toucher sans raison

- **CORS** : restreint à `adrien-casse-rag.vercel.app` + `adrien-casse-rag-*.vercel.app` + localhost
- **Rate limiting** : 20 req/IP/heure, in-memory (suffisant pour le trafic attendu)
- **Validation inputs** : max 500 chars, regex anti-injection dans `main.py`
- **Analytics** : IP hashée SHA-256 — pas de données personnelles stockées

Ne pas assouplir le CORS. Ne pas augmenter le rate limit sans raison documentée.

---

## Décisions de design — ne pas remettre en question sans raison forte

| Décision | Raison |
|----------|--------|
| fastembed (pas sentence-transformers) | Image Docker 10x plus légère (~150MB vs ~1.5GB) |
| NumPy cosine (pas FAISS) | 57 chunks — FAISS = overhead inutile |
| Groq (pas OpenAI) | Tier gratuit, 14 400 req/jour, latence ~300ms |
| SQLite (pas PostgreSQL) | Analytics uniquement, pas de concurrence critique |
| CSR Next.js (pas SSR) | Aucune donnée sensible, pas de SEO nécessaire |
| Knowledge en .md (pas base SQL) | Éditable manuellement, versionné en git |
| Embed à build time (pas runtime) | Startup immédiat, pas de latence au premier appel |

---

## Problèmes connus

- `layout.tsx` : le titre dit "Data Analyst" — doit être "Data Scientist"
- `page.tsx` footer : mentionne "FAISS" — FAISS n'est plus utilisé (NumPy cosine)
- `/stats` endpoint existe mais pas de dashboard — les données s'accumulent sans visualisation
- Pas de header `Retry-After` sur les 429 (rate limit)

---

## Ce qu'on ne fait pas ici

- Pas de base vectorielle externe (Pinecone, Weaviate) — overkill pour 57 chunks
- Pas d'auth — le chatbot est public par nature
- Pas de streaming de réponse — Groq est assez rapide sans
- Pas de multi-utilisateur côté backend — conversations non persistées (stateless)
- Pas de LangChain / LlamaIndex — RAG custom pour montrer la compréhension des mécanismes

---

## Conventions de commit

```
feat(knowledge) : <sujet>      # ajout/modification base de connaissance
feat(backend) : <feature>      # nouvelle fonctionnalité API
feat(frontend) : <feature>     # nouvelle fonctionnalité UI
fix(<scope>) : <description>   # correction de bug
chore : <description>          # maintenance, redeploy, deps
docs : <description>           # documentation uniquement
```
