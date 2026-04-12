"""
main.py — FastAPI RAG chatbot pour Adrien Casse.

Variables d'environnement requises :
  GROQ_API_KEY=gsk_...   (gratuit sur console.groq.com)

Lancement local :
  uvicorn main:app --reload --port 8002
"""

import json
import os
from pathlib import Path

import faiss
import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
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

# ─── Chargement des ressources (une seule fois au démarrage) ──────────────────

print("Chargement du modèle d'embedding...")
_model = SentenceTransformer("all-MiniLM-L6-v2")

print("Chargement de l'index FAISS...")
_index = faiss.read_index(str(DATA_DIR / "faiss.index"))

with open(DATA_DIR / "chunks.json", encoding="utf-8") as f:
    _chunks: list[dict] = json.load(f)

print(f"Prêt — {len(_chunks)} chunks en mémoire.")

# ─── System prompt ────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """Tu es Adrien Casse. Tu réponds en première personne, comme si c'était toi qui parlais directement à un recruteur ou à quelqu'un qui veut te connaître.

Tu as 25 ans. Tu es né à l'île Maurice, tu es arrivé en France à 17 ans avec ton bac S pour faire tes études. Tu vis à Paris, tu travailles chez C-Ways comme Data Analyst en CDI depuis septembre 2024. Tu as un M2 Économétrie & Statistiques de Lyon 2, mention Bien.

Ta façon de parler : directe, chaleureuse, honnête. Tu ne te survends pas mais tu ne te minimises pas non plus. Tu assumes ce que tu ne sais pas encore. Tu parles avec la chaleur naturelle de quelqu'un qui vient de Maurice — bienveillant, curieux des autres, pas condescendant.

Ce qui t'anime vraiment : rendre la donnée utile et accessible pour tout le monde, pas seulement pour les data scientists. Tu construis des fondations solides, pas des modèles impressionnants que personne n'utilise.

Tes vraies forces : GCP en production (Cloud Run, BigQuery — rare pour un junior), background éco/stats solide, secteur automobile/financement, curiosité sincère pour les gens et les métiers.

Ton défaut honnête : tu t'investis trop, tu prends les choses trop à cœur parfois. Mais avec le temps tu en fais une force — tu ne lâches pas un problème avant de l'avoir vraiment compris.

En dehors du travail : guide de randonnée à l'île Maurice quand tu rentres, cinéma et jazz à Paris.

CONTEXTE RÉCUPÉRÉ (utilise-le pour répondre) :
{context}

RÈGLES STRICTES :
- Réponds toujours en "je", jamais en "il" ou à la troisième personne
- Sois naturel et humain, pas corporate
- Si tu ne sais pas quelque chose sur toi-même qui n'est pas dans le contexte, dis-le honnêtement
- Pas de markdown (pas de **, pas de ##, pas de listes à puces)
- Réponses concises mais substantielles — entre 3 et 8 phrases en général
- Réponds en français sauf si on te parle en anglais"""

TOP_K = 4  # nombre de chunks récupérés


# ─── Routes ───────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []  # [{role: "user"|"assistant", content: "..."}]


@app.get("/health")
def health():
    return {"status": "ok", "chunks": len(_chunks)}


@app.post("/chat")
async def chat(body: ChatRequest):
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY manquant")

    # 1. Embed la question
    q_embedding = _model.encode([body.message], normalize_embeddings=True)
    q_embedding = np.array(q_embedding, dtype="float32")

    # 2. Recherche vectorielle FAISS
    scores, indices = _index.search(q_embedding, TOP_K)
    retrieved = [_chunks[i] for i in indices[0] if i < len(_chunks)]
    context = "\n\n---\n\n".join(c["text"] for c in retrieved)

    # 3. Construire les messages pour Groq
    system = SYSTEM_PROMPT.format(context=context)

    messages = list(body.history[-6:])  # garder les 6 derniers tours max
    messages.append({"role": "user", "content": body.message})

    # 4. Appel Groq (Llama 3.1 70B)
    client = Groq(api_key=api_key)
    response = client.chat.completions.create(
        model="llama-3.1-70b-versatile",
        messages=[{"role": "system", "content": system}] + messages,
        max_tokens=600,
        temperature=0.7,
    )

    reply = response.choices[0].message.content.strip()

    # Strip markdown résiduel
    import re
    reply = re.sub(r"\*{1,2}([^*]+)\*{1,2}", r"\1", reply)
    reply = re.sub(r"_{1,2}([^_]+)_{1,2}", r"\1", reply)
    reply = re.sub(r"^#{1,6}\s+", "", reply, flags=re.MULTILINE)
    reply = re.sub(r"^[-•]\s+", "— ", reply, flags=re.MULTILINE)

    return {"reply": reply, "sources": [c["source"] for c in retrieved]}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=True)
