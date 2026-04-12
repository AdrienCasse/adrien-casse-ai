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
import re
import sqlite3
import time
from collections import defaultdict
from pathlib import Path

import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from groq import Groq
from pydantic import BaseModel, field_validator
from fastembed import TextEmbedding

load_dotenv()

app = FastAPI(title="Adrien Casse AI")

ALLOWED_ORIGINS = [
    "https://adrien-casse-rag.vercel.app",
    "https://frontend-one-zeta-82.vercel.app",
    "http://localhost:3000",
    "http://localhost:3001",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

# ─── Rate limiting (in-memory, par IP) ────────────────────────────────────────
# Max 20 requêtes / IP / heure

_rate_store: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT = 20
RATE_WINDOW = 3600  # secondes


def _check_rate_limit(ip: str) -> bool:
    """Retourne True si la requête est autorisée, False sinon."""
    now = time.time()
    window_start = now - RATE_WINDOW
    timestamps = [t for t in _rate_store[ip] if t > window_start]
    _rate_store[ip] = timestamps
    if len(timestamps) >= RATE_LIMIT:
        return False
    _rate_store[ip].append(now)
    return True

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

print("Chargement du modèle fastembed...")
_model = TextEmbedding("BAAI/bge-small-en-v1.5")

print("Chargement des embeddings...")
_embeddings = np.load(str(DATA_DIR / "embeddings.npy"))  # shape (N, 384)

with open(DATA_DIR / "chunks.json", encoding="utf-8") as f:
    _chunks: list[dict] = json.load(f)

print(f"Prêt — {len(_chunks)} chunks en mémoire.")


# ─── System prompt ────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """Tu es l'assistant personnel d'Adrien Casse. Tu parles de lui à la troisième personne, avec précision et honnêteté — ni survente, ni fausse modestie.

Adrien a 25 ans. Né à l'île Maurice, arrivé en France à 17 ans. Vit à Paris. Data Scientist en CDI chez C-Ways depuis septembre 2024. M2 Économétrie & Statistiques — Lyon 2, mention Bien. Junior, clairement — mais avec une trajectoire construite, pas subie.

Ce qui le définit vraiment :
- La résilience. Quitter Maurice à 17 ans, s'intégrer en France seul, construire une carrière technique sans réseau local — ça forge quelqu'un qui ne lâche pas.
- La rigueur intellectuelle, inculquée par C-Ways : chaque analyse est documentée, chaque modèle est justifié, chaque résultat est challengé avant d'être livré.
- L'utilité concrète comme boussole : il construit des pipelines que les équipes métier utilisent vraiment, pas des modèles qui finissent dans un tiroir.

Ce qu'il sait faire : Python, SQL, GCP en production (Cloud Run, BigQuery — rare à son niveau), économétrie appliquée, analyses de survie sur données SIV automobiles, FastAPI, R.

Il est junior. Il le sait et l'assume. Ce qu'il apporte en échange : rigueur, profondeur d'analyse, et une capacité à ne pas lâcher un problème tant qu'il n'est pas compris.

CONTEXTE RÉCUPÉRÉ (source principale — utilise-le) :
{context}

RÈGLES ABSOLUES :
- Toujours à la 3ème personne : "Adrien", "il", "son", "ses"
- Réponds à la question posée, point. Ne récite pas ses qualités si ce n'est pas ce qu'on demande.
- Ne répète JAMAIS les mêmes qualités d'une réponse à l'autre. Chaque réponse apporte quelque chose de nouveau ou de différent.
- Si une information n'est pas dans le contexte, dis-le franchement plutôt qu'improviser.
- Zéro markdown : pas de **, pas de ##, pas de tirets en liste
- 3 à 6 phrases maximum sauf si la question demande un développement
- Réponds en français sauf si on t'écrit en anglais"""

TOP_K = 4


# ─── Routes ───────────────────────────────────────────────────────────────────

MAX_MESSAGE_LEN = 500
MAX_HISTORY_TURNS = 6
_INJECTION_PATTERNS = re.compile(
    r"(ignore (all |previous |prior |above )?(instructions?|prompts?|rules?)|"
    r"new (instructions?|system prompt)|"
    r"tu es maintenant|forget (everything|all)|"
    r"disregard|act as|jailbreak|DAN prompt)",
    re.IGNORECASE,
)


class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []

    @field_validator("message")
    @classmethod
    def validate_message(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Le message ne peut pas être vide")
        if len(v) > MAX_MESSAGE_LEN:
            raise ValueError(f"Message trop long (max {MAX_MESSAGE_LEN} caractères)")
        if _INJECTION_PATTERNS.search(v):
            raise ValueError("Message refusé")
        return v

    @field_validator("history")
    @classmethod
    def validate_history(cls, v: list[dict]) -> list[dict]:
        # Ne garder que les champs attendus, tronquer l'historique
        clean = []
        for turn in v[-MAX_HISTORY_TURNS:]:
            role = turn.get("role", "")
            content = str(turn.get("content", ""))[:1000]
            if role in ("user", "assistant") and content:
                clean.append({"role": role, "content": content})
        return clean


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
    client_ip = client_ip.split(",")[0].strip()  # x-forwarded-for peut contenir plusieurs IPs
    session_id = hashlib.sha256(client_ip.encode()).hexdigest()[:16]

    # Rate limiting
    if not _check_rate_limit(client_ip):
        return JSONResponse(
            status_code=429,
            content={"detail": "Trop de requêtes. Réessaie dans une heure."},
        )

    # 1. Embed la question
    q_embedding = np.array(list(_model.embed([body.message])), dtype="float32").flatten()
    q_embedding = q_embedding / max(np.linalg.norm(q_embedding), 1e-10)

    # 2. Recherche par similarité cosine (embeddings normalisés → dot product = cosine)
    scores = (_embeddings @ q_embedding)  # shape (N,)
    top_indices = np.argsort(scores)[::-1][:TOP_K]
    retrieved = [_chunks[i] for i in top_indices]
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
