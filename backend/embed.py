"""
embed.py — Construit l'index FAISS à partir des fichiers markdown de /knowledge.

Usage : python embed.py
Produit : faiss.index + chunks.json dans /backend/data/
"""

import json
import os
import re
from pathlib import Path

import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

KNOWLEDGE_DIR = Path(__file__).parent.parent / "knowledge"
DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)

CHUNK_SIZE = 400      # caractères par chunk
CHUNK_OVERLAP = 80    # chevauchement pour ne pas couper le contexte


def load_markdown_files() -> list[dict]:
    docs = []
    for md_file in sorted(KNOWLEDGE_DIR.glob("*.md")):
        text = md_file.read_text(encoding="utf-8")
        # Supprimer les titres markdown pour garder le texte pur
        text = re.sub(r"^#+\s+", "", text, flags=re.MULTILINE)
        text = text.strip()
        docs.append({"source": md_file.stem, "text": text})
    return docs


def chunk_text(text: str, source: str) -> list[dict]:
    """Découpe un texte en chunks avec overlap."""
    chunks = []
    # Découper par paragraphes d'abord (double saut de ligne)
    paragraphs = [p.strip() for p in re.split(r"\n{2,}", text) if p.strip()]

    current_chunk = ""
    for para in paragraphs:
        if len(current_chunk) + len(para) < CHUNK_SIZE:
            current_chunk = (current_chunk + "\n\n" + para).strip()
        else:
            if current_chunk:
                chunks.append({"text": current_chunk, "source": source})
            # Overlap : garder la fin du chunk précédent
            overlap = current_chunk[-CHUNK_OVERLAP:] if len(current_chunk) > CHUNK_OVERLAP else current_chunk
            current_chunk = (overlap + "\n\n" + para).strip()

    if current_chunk:
        chunks.append({"text": current_chunk, "source": source})

    return chunks


def build_index():
    print("Chargement des fichiers markdown...")
    docs = load_markdown_files()
    print(f"  {len(docs)} fichiers trouvés : {[d['source'] for d in docs]}")

    all_chunks = []
    for doc in docs:
        chunks = chunk_text(doc["text"], doc["source"])
        all_chunks.extend(chunks)
        print(f"  {doc['source']} → {len(chunks)} chunks")

    print(f"\nTotal : {len(all_chunks)} chunks à encoder")

    print("\nChargement du modèle d'embedding...")
    model = SentenceTransformer("all-MiniLM-L6-v2")  # 384 dims, rapide, très bon pour FR+EN

    print("Encoding...")
    texts = [c["text"] for c in all_chunks]
    embeddings = model.encode(texts, show_progress_bar=True, normalize_embeddings=True)
    embeddings = np.array(embeddings, dtype="float32")

    print("\nConstruction de l'index FAISS...")
    dim = embeddings.shape[1]
    index = faiss.IndexFlatIP(dim)  # Inner Product = cosine similarity (embeddings normalisés)
    index.add(embeddings)

    # Sauvegarde
    faiss.write_index(index, str(DATA_DIR / "faiss.index"))
    with open(DATA_DIR / "chunks.json", "w", encoding="utf-8") as f:
        json.dump(all_chunks, f, ensure_ascii=False, indent=2)

    print(f"\nIndex sauvegardé : {DATA_DIR}/faiss.index")
    print(f"Chunks sauvegardés : {DATA_DIR}/chunks.json")
    print(f"Done — {len(all_chunks)} chunks indexés.")


if __name__ == "__main__":
    build_index()
