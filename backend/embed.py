"""
embed.py — Construit l'index d'embeddings à partir des fichiers markdown de /knowledge.
Utilise fastembed (ONNX) au lieu de sentence-transformers (PyTorch) — 10x plus léger.

Usage : python3 embed.py
Produit : embeddings.npy + chunks.json dans /backend/data/
"""

import json
import re
from pathlib import Path

import numpy as np
from fastembed import TextEmbedding

KNOWLEDGE_DIR = Path(__file__).parent.parent / "knowledge"
DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)

CHUNK_SIZE = 400
CHUNK_OVERLAP = 80
MODEL_NAME = "BAAI/bge-small-en-v1.5"  # 33MB, multilingue, très bon pour FR+EN


def load_markdown_files() -> list[dict]:
    docs = []
    for md_file in sorted(KNOWLEDGE_DIR.glob("*.md")):
        text = md_file.read_text(encoding="utf-8")
        text = re.sub(r"^#+\s+", "", text, flags=re.MULTILINE)
        text = text.strip()
        docs.append({"source": md_file.stem, "text": text})
    return docs


def chunk_text(text: str, source: str) -> list[dict]:
    chunks = []
    paragraphs = [p.strip() for p in re.split(r"\n{2,}", text) if p.strip()]
    current_chunk = ""
    for para in paragraphs:
        if len(current_chunk) + len(para) < CHUNK_SIZE:
            current_chunk = (current_chunk + "\n\n" + para).strip()
        else:
            if current_chunk:
                chunks.append({"text": current_chunk, "source": source})
            overlap = current_chunk[-CHUNK_OVERLAP:] if len(current_chunk) > CHUNK_OVERLAP else current_chunk
            current_chunk = (overlap + "\n\n" + para).strip()
    if current_chunk:
        chunks.append({"text": current_chunk, "source": source})
    return chunks


def build_index():
    print("Chargement des fichiers markdown...")
    docs = load_markdown_files()
    print(f"  {len(docs)} fichiers : {[d['source'] for d in docs]}")

    all_chunks = []
    for doc in docs:
        chunks = chunk_text(doc["text"], doc["source"])
        all_chunks.extend(chunks)
        print(f"  {doc['source']} → {len(chunks)} chunks")

    print(f"\nTotal : {len(all_chunks)} chunks à encoder")

    print(f"Chargement du modèle fastembed ({MODEL_NAME})...")
    model = TextEmbedding(MODEL_NAME)

    print("Encoding...")
    texts = [c["text"] for c in all_chunks]
    embeddings_gen = model.embed(texts)
    embeddings = np.array(list(embeddings_gen), dtype="float32")

    # Normaliser pour cosine similarity via dot product
    norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
    embeddings = embeddings / np.maximum(norms, 1e-10)

    np.save(str(DATA_DIR / "embeddings.npy"), embeddings)
    with open(DATA_DIR / "chunks.json", "w", encoding="utf-8") as f:
        json.dump(all_chunks, f, ensure_ascii=False, indent=2)

    print(f"\nDone — {len(all_chunks)} chunks indexés, shape {embeddings.shape}")
    print(f"Embeddings : {DATA_DIR}/embeddings.npy")
    print(f"Chunks     : {DATA_DIR}/chunks.json")


if __name__ == "__main__":
    build_index()
