import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Root directory of ml-service/
ROOT_DIR = Path(__file__).resolve().parent.parent

# Port for the FastAPI server
PORT = int(os.getenv("ML_SERVICE_PORT", "8000"))

# ChromaDB persistence directory
_chroma_data = os.getenv("CHROMA_DATA_DIR", str(ROOT_DIR.parent / "chroma_data"))
CHROMA_DATA_DIR = Path(_chroma_data).resolve()
CHROMA_DATA_DIR.mkdir(parents=True, exist_ok=True)

# Collection prefix (matches the JS side)
COLLECTION_PREFIX = "ls_project_"
