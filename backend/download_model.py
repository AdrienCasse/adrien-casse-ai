"""
download_model.py — Télécharge le modèle ONNX au build time (Vercel).

Exécuté via buildCommand dans vercel.json. Les fichiers créés dans ./models/
sont inclus dans le bundle de la Vercel Function.
"""
from pathlib import Path
from fastembed import TextEmbedding

cache_dir = str(Path(__file__).parent / "models")
print(f"Téléchargement du modèle → {cache_dir}")
model = TextEmbedding("BAAI/bge-small-en-v1.5", cache_dir=cache_dir)
list(model.embed(["warmup"]))
print("Modèle prêt.")
