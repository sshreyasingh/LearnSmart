import chromadb
from chromadb.config import Settings
from app.config import CHROMA_DATA_DIR, COLLECTION_PREFIX


# Singleton client — ChromaDB in embedded mode persists to SQLite on disk
_client = None


def _get_client():
    global _client
    if _client is not None:
        return _client
    _client = chromadb.PersistentClient(
        path=str(CHROMA_DATA_DIR),
        settings=Settings(anonymized_telemetry=False),
    )
    return _client


def is_ready() -> bool:
    """Quick health check — ChromaDB is always ready in embedded mode."""
    try:
        _get_client().heartbeat()
        return True
    except Exception:
        return False


def _collection_name(project_id: str) -> str:
    return f"{COLLECTION_PREFIX}{project_id}"


def get_or_create_collection(project_id: str):
    client = _get_client()
    name = _collection_name(project_id)
    return client.get_or_create_collection(
        name=name,
        metadata={"hnsw:space": "cosine"},
    )


def index_chunks(project_id: str, chunks: list, vectors: list) -> int:
    """Index chunks into ChromaDB. Returns the number indexed."""
    if not chunks or not vectors:
        return 0

    collection = get_or_create_collection(project_id)
    import time

    ids = [
        f"{project_id}_chunk_{i}_{int(time.time() * 1000)}"
        for i in range(len(chunks))
    ]

    documents = []
    metadatas = []
    for chunk in chunks:
        header = ""
        if chunk.get("functionName"):
            header = f"[Function: {chunk['functionName']}]\n"
        elif chunk.get("className"):
            header = f"[Class: {chunk['className']}]\n"
        documents.append(f"{header}{chunk.get('content', '')}")

        metadatas.append({
            "filePath": chunk.get("filePath", ""),
            "fileName": chunk.get("fileName", ""),
            "language": chunk.get("language", ""),
            "functionName": chunk.get("functionName", ""),
            "className": chunk.get("className", ""),
            "symbolType": chunk.get("symbolType", ""),
            "projectId": str(project_id),
            "startLine": str(chunk.get("startLine", 0)),
            "endLine": str(chunk.get("endLine", 0)),
            "isSubChunk": "true" if chunk.get("isSubChunk") else "false",
        })

    # Add in batches of 20
    BATCH_SIZE = 20
    for i in range(0, len(ids), BATCH_SIZE):
        end = min(i + BATCH_SIZE, len(ids))
        collection.add(
            ids=ids[i:end],
            embeddings=vectors[i:end],
            documents=documents[i:end],
            metadatas=metadatas[i:end],
        )

    return len(chunks)


def search(
    project_id: str,
    query_vector: list,
    limit: int = 5,
) -> list:
    """Search ChromaDB with a pre-computed query vector."""
    collection = get_or_create_collection(project_id)

    results = collection.query(
        query_embeddings=[query_vector],
        n_results=limit * 2,
    )

    if not results or not results.get("ids") or not results["ids"][0]:
        return []

    scored = []
    ids = results["ids"][0]
    distances = results.get("distances", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    documents = results.get("documents", [[]])[0]

    for i in range(len(ids)):
        distance = distances[i] if i < len(distances) else 1.0
        score = max(0.0, 1.0 - distance)

        if score < 0.1:
            continue
        if len(scored) >= limit:
            break

        meta = metadatas[i] if i < len(metadatas) else {}
        scored.append({
            "chunkHash": ids[i],
            "filePath": meta.get("filePath", ""),
            "fileName": meta.get("fileName", ""),
            "language": meta.get("language", ""),
            "content": documents[i] if i < len(documents) else "",
            "startLine": int(meta.get("startLine", 0)),
            "endLine": int(meta.get("endLine", 0)),
            "functionName": meta.get("functionName") or None,
            "className": meta.get("className") or None,
            "symbolType": meta.get("symbolType") or None,
            "score": score,
        })

    scored.sort(key=lambda r: r["score"], reverse=True)
    return scored[:limit]


def delete_collection(project_id: str) -> None:
    """Delete a project's collection."""
    client = _get_client()
    name = _collection_name(project_id)
    try:
        client.delete_collection(name)
    except ValueError:
        pass  # collection doesn't exist


def list_collections() -> list:
    """List all collection names (for debugging)."""
    client = _get_client()
    return [col.name for col in client.list_collections()]
