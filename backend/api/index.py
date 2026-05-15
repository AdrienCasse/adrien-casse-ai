import sys
from pathlib import Path

# Expose the FastAPI app to the Vercel Python runtime.
# sys.path adjustment lets Vercel find main.py one level up.
sys.path.insert(0, str(Path(__file__).parent.parent))

from main import app  # noqa: F401 — re-exported for Vercel
