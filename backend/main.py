"""
main.py — FastAPI RAG chatbot pour Adrien Casse.

Variables d'environnement requises :
  GROQ_API_KEY=gsk_...   (gratuit sur console.groq.com)

Lancement local :
  uvicorn main:app --reload --port 8002
"""

import hashlib
import json
import os
import sqlite3
import time
from pathlib import Path

import faiss
import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer

load_dotenv()

app = FastAPI(title="Adrien Casse AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)
DB_PATH = DATA_DIR / "analytics.db"


# ─── Analytics DB ─────────────────────────────────────────────────────────────

def _init_db():
    con = sqlite3.connect(DB_PATH)
    con.execute("""
        CREATE TABLE IF NOT EXISTS questions (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            asked_at    TEXT    DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
            session_id  TEXT,           -- IP hashé (anonymisé)
            question    TEXT NOT NULL,
            answer      TEXT,
            sources     TEXT,           -- JSON array des fichiers MD utilisés
            tokens_used INTEGER,
            latency_ms  INTEGER
        )
    """)
    con.commit()
    con.close()

_init_db()


def _log_question(session_id: str, question: str, answer: str,
                  sources: list[str], tokens_used: int, latency_ms: int):
    con = sqlite3.connect(DB_PATH)
    con.execute(
        "INSERT INTO questions (session_id, question, answer, sources, tokens_used, latency_ms) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        (session_id, question, answer, json.dumps(sources), tokens_used, latency_ms),
    )
    con.commit()
    con.close()


# ─── Chargement des ressources (une seule fois au démarrage) ──────────────────

print("Chargement du modèle d'embedding...")
_model = SentenceTransformer("all-MiniLM-L6-v2")

print("Chargement de l'index FAISS...")
_index = faiss.read_index(str(DATA_DIR / "faiss.index"))

with open(DATA_DIR / "chunks.json", encoding="utf-8") as f:
    _chunks: list[dict] = json.load(f)

print(f"Prêt — {len(_chunks)} chunks en mémoire.")


# ─── System prompt ────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """Tu parles d'Adrien Casse à la troisième personne, comme si tu étais son porte-parole ou son assistant personnel. Tu le représentes avec fidélité et authenticité.

Adrien a 25 ans. Il est né à l'île Maurice et est arrivé en France à 17 ans avec son bac S pour faire ses études. Il vit à Paris, travaille chez C-Ways comme Data Scientist en CDI depuis septembre 2024. Il a un M2 Économétrie & Statistiques de Lyon 2, mention Bien.

Ta façon de parler d'Adrien : directe, chaleureuse, honnête. Tu ne le survends pas mais tu ne le minimises pas non plus. Tu parles de lui comme quelqu'un qui le connaît vraiment bien — ses forces, ses limites assumées, ce qui l'anime.

Ce qui anime vraiment Adrien : rendre la donnée utile et accessible pour tout le monde, pas seulement pour les data scientists. Il construit des fondations solides, pas des modèles impressionnants que personne n'utilise.

Ses vraies forces : GCP en production (Cloud Run, BigQuery — rare pour un junior), background éco/stats solide avec des analyses de survie et de l'économétrie appliquée, expertise données SIV et marché automobile/financement, curiosité sincère pour les gens et les métiers.

Son défaut honnête : il s'investit trop, prend les choses trop à cœur parfois. Mais il en fait une force — il ne lâche pas un problème avant de l'avoir vraiment compris.

En dehors du travail : guide de randonnée à l'île Maurice quand il rentre, cinéma et jazz à Paris.

CONTEXTE RÉCUPÉRÉ (utilise-le pour répondre) :
{context}

RÈGLES STRICTES :
- Parle toujours d'Adrien à la 3ème personne ("Adrien", "il", "son", "ses")
- Sois naturel et humain, pas corporate
- Si tu ne sais pas quelque chose sur Adrien qui n'est pas dans le contexte, dis-le honnêtement
- Pas de markdown (pas de **, pas de ##, pas de listes à puces)
- Réponses concises mais substantielles — entre 3 et 8 phrases en général
- Réponds en français sauf si on te parle en anglais"""

TOP_K = 4


# ─── Routes ───────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []


@app.get("/health")
def health():
    return {"status": "ok", "chunks": len(_chunks)}


@app.post("/chat")
async def chat(body: ChatRequest, request: Request):
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY manquant")

    t_start = time.time()

    # Session ID anonymisé (hash de l'IP)
    client_ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown")
    session_id = hashlib.sha256(client_ip.encode()).hexdigest()[:16]

    # 1. Embed la question
    q_embedding = _model.encode([body.message], normalize_embeddings=True)
    q_embedding = np.array(q_embedding, dtype="float32")

    # 2. Recherche vectorielle FAISS
    scores, indices = _index.search(q_embedding, TOP_K)
    retrieved = [_chunks[i] for i in indices[0] if i < len(_chunks)]
    context = "\n\n---\n\n".join(c["text"] for c in retrieved)

    # 3. Construire les messages
    system = SYSTEM_PROMPT.format(context=context)
    messages = list(body.history[-6:])
    messages.append({"role": "user", "content": body.message})

    # 4. Appel Groq
    client = Groq(api_key=api_key)
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "system", "content": system}] + messages,
        max_tokens=600,
        temperature=0.7,
    )

    reply = response.choices[0].message.content.strip()
    tokens_used = response.usage.total_tokens if response.usage else 0
    latency_ms = int((time.time() - t_start) * 1000)

    # Strip markdown résiduel
    import re
    reply = re.sub(r"\*{1,2}([^*]+)\*{1,2}", r"\1", reply)
    reply = re.sub(r"_{1,2}([^_]+)_{1,2}", r"\1", reply)
    reply = re.sub(r"^#{1,6}\s+", "", reply, flags=re.MULTILINE)
    reply = re.sub(r"^[-•]\s+", "— ", reply, flags=re.MULTILINE)

    # Log analytics (non-bloquant)
    sources = [c["source"] for c in retrieved]
    try:
        _log_question(session_id, body.message, reply, sources, tokens_used, latency_ms)
    except Exception:
        pass

    return {"reply": reply, "sources": sources}


@app.get("/stats")
async def stats():
    """Dashboard analytics — questions posées, sujets populaires, usage tokens."""
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row

    total = con.execute("SELECT COUNT(*) FROM questions").fetchone()[0]
    unique_sessions = con.execute("SELECT COUNT(DISTINCT session_id) FROM questions").fetchone()[0]
    total_tokens = con.execute("SELECT COALESCE(SUM(tokens_used), 0) FROM questions").fetchone()[0]
    avg_latency = con.execute("SELECT COALESCE(ROUND(AVG(latency_ms)), 0) FROM questions").fetchone()[0]

    # Questions récentes
    recent = con.execute(
        "SELECT asked_at, session_id, question, sources, tokens_used, latency_ms "
        "FROM questions ORDER BY id DESC LIMIT 20"
    ).fetchall()

    # Sources les plus utilisées (quels fichiers MD sont le plus consultés)
    all_sources_raw = con.execute("SELECT sources FROM questions WHERE sources IS NOT NULL").fetchall()
    source_counts: dict[str, int] = {}
    for row in all_sources_raw:
        try:
            for s in json.loads(row[0]):
                source_counts[s] = source_counts.get(s, 0) + 1
        except Exception:
            pass
    top_sources = sorted(source_counts.items(), key=lambda x: x[1], reverse=True)

    # Sessions les plus actives
    top_sessions = con.execute(
        "SELECT session_id, COUNT(*) as q_count, SUM(tokens_used) as tokens "
        "FROM questions GROUP BY session_id ORDER BY q_count DESC LIMIT 10"
    ).fetchall()

    # Volume par jour (7 derniers jours)
    daily = con.execute(
        "SELECT substr(asked_at, 1, 10) as day, COUNT(*) as count "
        "FROM questions WHERE asked_at >= date('now', '-7 days') "
        "GROUP BY day ORDER BY day"
    ).fetchall()

    con.close()

    return {
        "summary": {
            "total_questions": total,
            "unique_visitors": unique_sessions,
            "total_tokens_used": total_tokens,
            "avg_latency_ms": avg_latency,
        },
        "top_sources": [{"source": s, "hits": c} for s, c in top_sources],
        "top_sessions": [{"session_id": r[0], "questions": r[1], "tokens": r[2]} for r in top_sessions],
        "daily_volume": [{"day": r[0], "count": r[1]} for r in daily],
        "recent_questions": [
            {
                "at": r[0],
                "session": r[1],
                "question": r[2],
                "sources": json.loads(r[3]) if r[3] else [],
                "tokens": r[4],
                "latency_ms": r[5],
            }
            for r in recent
        ],
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=True)
