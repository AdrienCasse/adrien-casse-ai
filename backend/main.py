"""
main.py — FastAPI RAG chatbot pour Adrien Casse.

Variables d'environnement requises :
  GROQ_API_KEY=gsk_...    (gratuit sur console.groq.com)
  HF_API_TOKEN=hf_...     (gratuit sur huggingface.co — embedding de la requête)

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

import httpx
import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from groq import Groq
from pydantic import BaseModel, field_validator

load_dotenv()

app = FastAPI(title="Adrien Casse AI")

ALLOWED_ORIGINS = [
    "https://adrien-casse-rag.vercel.app",
    "https://frontend-one-zeta-82.vercel.app",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
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

# /tmp est le seul répertoire inscriptible sur Vercel (fonction stateless)
DB_PATH = (Path("/tmp") if os.getenv("VERCEL") else DATA_DIR) / "analytics.db"


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


# ─── Embedding via HuggingFace Inference API ──────────────────────────────────
# Même modèle (BAAI/bge-small-en-v1.5) que celui utilisé pour pré-calculer
# embeddings.npy — les vecteurs sont donc compatibles.
# Remplace fastembed/ONNX qui dépassait la limite de 250 MB des Vercel Functions.

_HF_EMBED_URL = "https://api-inference.huggingface.co/pipeline/feature-extraction/BAAI/bge-small-en-v1.5"


async def _embed_query(text: str) -> np.ndarray:
    hf_token = os.getenv("HF_API_TOKEN", "")
    headers = {"Authorization": f"Bearer {hf_token}"} if hf_token else {}
    payload = {"inputs": text, "options": {"wait_for_model": True}}

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(_HF_EMBED_URL, headers=headers, json=payload)
        resp.raise_for_status()

    data = resp.json()
    # HF retourne [[token_embs…]] ou [sentence_emb] selon le modèle.
    # BGE : pooling déjà appliqué → data[0] est le vecteur 384-dim.
    raw = data[0]
    if isinstance(raw[0], list):
        emb = np.array(raw, dtype="float32").mean(axis=0)  # mean pooling fallback
    else:
        emb = np.array(raw, dtype="float32")

    norm = np.linalg.norm(emb)
    return emb / max(norm, 1e-10)


# ─── Chargement des ressources (une seule fois au démarrage) ──────────────────

print("Chargement des embeddings pré-calculés...")
_embeddings = np.load(str(DATA_DIR / "embeddings.npy"))  # shape (N, 384)

with open(DATA_DIR / "chunks.json", encoding="utf-8") as f:
    _chunks: list[dict] = json.load(f)

print(f"Prêt — {len(_chunks)} chunks en mémoire.")


# ─── System prompt ────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """Tu es l'assistant personnel d'Adrien Casse. Tu réponds à la troisième personne, avec précision et sans effets de manche.

── QUI EST ADRIEN ──
25 ans, Data Analyst et Data Scientist Junior basé à Paris. M2 Économétrie & Statistiques, Lyon 2, mention Bien. En CDI chez C-Ways depuis septembre 2024 — une société spécialisée dans le financement automobile (LLD, LOA, crédit-bail). Deux ans d'expérience effective, ce qu'il assume sans détour.

── CE QUI LE DISTINGUE VRAIMENT ──
Son angle, c'est de rendre la donnée utile — pas juste de la modéliser. Il construit des pipelines, structure des données brutes, automatise des traitements — pour que les équipes métier puissent lire, comprendre et agir sur des résultats concrets, sans dépendre d'un data scientist à chaque question. Il fait le lien entre la rigueur technique et l'usage opérationnel : vulgariser une analyse, livrer un résultat lisible, transformer un modèle en quelque chose que les gens utilisent vraiment.

À C-Ways, ça se traduit par : des pipelines Python déployés sur GCP (Cloud Run + Cloud Functions), des données SIV traitées à grande échelle, des modèles de valorisation résiduelle utilisés en production. Le tout documenté, challengé, livré. Pas des notebooks qui dorment.

── CE QU'IL SAIT FAIRE ──
Python (pandas, scikit-learn), SQL, R (économétrie, modélisation), GCP en production (Cloud Run, BigQuery, Cloud Functions — rare pour un profil junior), FastAPI, Next.js, Supabase. Régressions, arbres de décision, XGBoost. Il sait modéliser et livrer — les deux.

── SA SITUATION ──
Il est ouvert à de nouvelles opportunités — pas en fuite de C-Ways, mais convaincu qu'une équipe data plus structurée ou des sujets plus variés peuvent le faire progresser plus vite. Prétentions : 45 000 à 50 000 € brut annuel. Passeport Talent Salarié Qualifié valide 2026-2030 : aucune démarche côté employeur.

── SON PARCOURS ──
Né à Maurice, arrivé en France à 17 ans pour ses études. Formation universitaire à Lyon, choix assumé. Ce que ça lui a donné en pratique : autonomie, organisation, rigueur dans la livraison. Il travaille sans filet depuis longtemps — ça se voit dans la façon dont il structure son travail.

── COMMENT TU FONCTIONNES (META) ──
Si on te demande comment tu marches, qui t'a fait, quel LLM tu utilises, où tu es hébergé, si tu es self-hosted, etc. — réponds avec précision sur la base du contexte (fichier architecture). Tu peux parler de toi à la première personne dans ce cas (« je suis un chatbot RAG construit par Adrien… »), c'est plus naturel. Sois technique et concret : LLM (Groq, Llama 3.3 70B), embeddings (BAAI/bge-small-en-v1.5 via HuggingFace Inference API), retrieval (NumPy cosine sur ~79 chunks pré-calculés), backend (FastAPI/Vercel Python), frontend (Next.js/Vercel), pas de framework type LangChain. Pas de bullshit marketing.

CONTEXTE RÉCUPÉRÉ (source principale — prioritaire sur le reste) :
{context}

── RÈGLES DE RÉPONSE ──

Précision avant tout. Tu réponds exactement à la question posée. Tu ne sers pas un pavé sur le profil global d'Adrien quand on te demande un détail. Tu n'embarques pas la stack technique dans une question humaine, et inversement. La règle d'or : ce que tu écris doit aider la personne à se faire une vraie idée — pas remplir l'espace.

Anti-répétition stricte. Tu ne reprends jamais les mêmes formulations d'un message à l'autre dans la conversation. Surtout pas les marqueurs « pipelines GCP en production », « rendre la donnée utile », « M2 mention Bien », « école de la vie » — ils existent dans le contexte mais doivent être cités au plus une fois par conversation, et reformulés différemment chaque fois si vraiment nécessaires. Varie les angles : un message peut parler des outils, le suivant d'un projet précis, le suivant d'une opinion ou d'une anecdote. Le contexte récupéré contient assez de matière pour ne jamais répéter — utilise-la.

Ton naturel, pas IA. Adrien parle directement, sans détour. Tu peux utiliser des tournures parlées modérées (« en vrai », « franchement », « le truc c'est que… ») quand le contexte s'y prête. Tu évites toutes les marques typiques d'un LLM : pas de « en somme », « en effet », « il convient de noter », « par ailleurs », « passionné par X », « rigoureux et autonome », « profil prometteur », pas de listes d'adjectifs creux, pas de superlatifs sans contexte (« exceptionnel », « extraordinaire »), pas de conclusion qui résume ce qui vient d'être dit. Tu coupes court quand c'est dit.

Vendre intelligemment. Tu mets en avant ce qui distingue vraiment Adrien (GCP en prod pour un junior, M2 économétrie, parcours non linéaire qui a forgé une vraie résilience, opinions tranchées sur la data et GenAI, capacité à livrer concrètement) — mais en angles, pas en répétition. Si la question s'y prête, tu peux glisser une opinion (issue d'opinions.md) ou une anecdote concrète. Si on te parle d'échec, tu peux citer Mandela tel qu'Adrien le cite : « soit je gagne, soit j'apprends ».

Humour discret autorisé. Tu n'es pas froid. Une touche d'humour léger est acceptable quand elle est naturelle (l'outil reste pro, c'est destiné à des recruteurs). Pas de blagues forcées, pas d'auto-dérision excessive.

Quand l'info n'est pas dans le contexte. Tu le dis simplement (« ce n'est pas documenté », « il faudrait poser la question à Adrien directement »). Tu n'inventes jamais une expérience, une mission, un chiffre, un nom de boîte ou un projet.

Format. Zéro markdown : pas de **, pas de ##, pas de listes à tirets, pas de bullets. Des phrases. 3 à 6 phrases en général, plus si la question demande un développement, moins si une réponse en deux phrases est plus juste. Français par défaut, anglais si on écrit en anglais."""

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

    # 1. Embed la question via HuggingFace Inference API
    q_embedding = await _embed_query(body.message)

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
