from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.chroma_client import (
    is_ready,
    index_chunks,
    search,
    delete_collection,
    list_collections,
)

router = APIRouter()


# ─── Request/Response schemas ───


class Chunk(BaseModel):
    filePath: Optional[str] = ""
    fileName: Optional[str] = ""
    language: Optional[str] = ""
    content: Optional[str] = ""
    startLine: Optional[int] = 0
    endLine: Optional[int] = 0
    functionName: Optional[str] = ""
    className: Optional[str] = ""
    symbolType: Optional[str] = ""
    isSubChunk: Optional[bool] = False


class IndexRequest(BaseModel):
    chunks: list[Chunk]
    vectors: list[list[float]]


class IndexResponse(BaseModel):
    indexed: int


class SearchRequest(BaseModel):
    query_vector: list[float]
    limit: int = 5


class SearchResult(BaseModel):
    chunkHash: str
    filePath: str
    fileName: str
    language: str
    content: str
    startLine: int
    endLine: int
    functionName: Optional[str] = None
    className: Optional[str] = None
    symbolType: Optional[str] = None
    score: float


class DeleteResponse(BaseModel):
    deleted: bool


class HealthResponse(BaseModel):
    status: str
    collections: int


# ─── Routes ───


@router.get("/health", response_model=HealthResponse)
def health():
    if not is_ready():
        raise HTTPException(status_code=503, detail="ChromaDB not ready")
    return HealthResponse(
        status="ok",
        collections=len(list_collections()),
    )


@router.post("/collections/{project_id}/index", response_model=IndexResponse)
def index(project_id: str, body: IndexRequest):
    if not body.chunks or not body.vectors:
        raise HTTPException(status_code=400, detail="chunks and vectors are required")
    if len(body.chunks) != len(body.vectors):
        raise HTTPException(
            status_code=400,
            detail=f"chunks ({len(body.chunks)}) and vectors ({len(body.vectors)}) length mismatch",
        )

    try:
        count = index_chunks(
            project_id,
            [chunk.model_dump() for chunk in body.chunks],
            body.vectors,
        )
        return IndexResponse(indexed=count)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/collections/{project_id}/search", response_model=list[SearchResult])
def search_route(project_id: str, body: SearchRequest):
    if not body.query_vector:
        raise HTTPException(status_code=400, detail="query_vector is required")

    try:
        results = search(project_id, body.query_vector, body.limit)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/collections/{project_id}", response_model=DeleteResponse)
def delete(project_id: str):
    try:
        delete_collection(project_id)
        return DeleteResponse(deleted=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
