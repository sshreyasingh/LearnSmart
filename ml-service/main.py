"""LearnSmart ML Service — embedded ChromaDB + ML endpoints.

Run:
    pip install -r requirements.txt
    python main.py
"""

import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import PORT
from app.routes import router

app = FastAPI(title="LearnSmart ML Service", version="1.0.0", root_path="/ai")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", PORT)),
        reload=os.getenv("ENV", "development") == "development",
    )
