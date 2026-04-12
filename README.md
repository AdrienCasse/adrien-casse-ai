# Adrien Casse AI — Personal RAG Chatbot

A full-stack RAG chatbot that answers questions about me, speaking in first person as if it were me.

**Live demo**: [adrien-casse.vercel.app](https://adrien-casse.vercel.app) _(à déployer)_

## Architecture

```
Question from recruiter
        ↓
Embedding (sentence-transformers all-MiniLM-L6-v2)
        ↓
Vector search in FAISS index (cosine similarity)
        ↓
Top-4 chunks injected into system prompt
        ↓
Llama 3.1 70B via Groq API generates answer in first person
        ↓
Next.js chat UI
```

## Stack

- **Embedding**: `sentence-transformers` (all-MiniLM-L6-v2, 384 dims)
- **Vector store**: FAISS (IndexFlatIP, cosine similarity)
- **LLM**: Llama 3.1 70B via Groq (free tier: 14k req/day)
- **Backend**: FastAPI + Python 3.11
- **Frontend**: Next.js 14, no CSS framework
- **Deploy**: Vercel (frontend) + Railway (backend)

## Knowledge base

Seven markdown files covering:
- `moi.md` — Who I am, Mauritius, Paris
- `parcours.md` — Education (M2 Lyon 2) + work experience (C-Ways, internships)
- `projets.md` — GitHub projects (hedonic regression, residual value, job-hunter, this chatbot)
- `stack.md` — Honest technical skills (what I actually know vs. what I don't yet)
- `valeurs.md` — Why data, what drives me
- `humain.md` — Personality, strengths, honest weaknesses
- `faq.md` — Pre-answered recruiter questions

## Setup

### 1. Clone & install

```bash
git clone https://github.com/AdrienCasse/adrien-casse-ai
cd adrien-casse-ai
```

### 2. Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Build FAISS index from knowledge base
python embed.py

# Start API
uvicorn main:app --reload --port 8002
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev  # port 3002
```

### 4. Environment

```bash
cp .env.example .env
# Fill in GROQ_API_KEY (free at console.groq.com)
```

## Local dev

| Service | Port |
|---------|------|
| Backend API | 8002 |
| Frontend | 3002 |

## Why Groq instead of OpenAI/Anthropic

- Free tier: 14,400 requests/day — more than enough for a portfolio project
- Llama 3.1 70B quality is excellent for conversational Q&A
- Open-source model: more interesting as a technical choice on a CV
- Extremely fast inference (LPU hardware)

---

Built by [Adrien Casse](https://github.com/AdrienCasse) · Data Analyst · Paris
