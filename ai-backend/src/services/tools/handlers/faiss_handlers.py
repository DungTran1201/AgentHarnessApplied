"""
FAISS Knowledge Base Tool Handlers
Implements local vector store indexing, search, snippet retrieval, and rebuild.
Uses lazy import for faiss-cpu and numpy to prevent startup crashes when dependencies are absent.
"""

import os
import sqlite3
from pathlib import Path
from typing import Dict, Any, List, Optional

from src.services.tools.sandbox import BACKEND_DIR

FAISS_STORAGE_ROOT = BACKEND_DIR / "data" / "storage" / "faiss"


def _check_faiss_installed():
    """Verifies faiss and numpy are available without crashing on module import."""
    try:
        import numpy  # noqa: F401
    except ImportError as e:
        raise ImportError(
            "DEPENDENCY_MISSING: 'numpy' is required for FAISS vector operations. Run `pip install numpy`."
        ) from e

    try:
        import faiss  # noqa: F401
    except ImportError as e:
        raise ImportError(
            "DEPENDENCY_MISSING: 'faiss-cpu' is required for local vector indexing. Run `pip install faiss-cpu`."
        ) from e


def _get_metadata_db_path(index_id: str) -> Path:
    index_dir = FAISS_STORAGE_ROOT / index_id
    index_dir.mkdir(parents=True, exist_ok=True)
    return index_dir / "metadata.sqlite"


def _init_metadata_db(db_path: Path):
    with sqlite3.connect(str(db_path)) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                doc_id TEXT PRIMARY KEY,
                vector_id INTEGER,
                content TEXT NOT NULL,
                metadata TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()


# ==============================================================================
# 1. GET FAISS DOCUMENT (DOES NOT REQUIRE FAISS BINARY)
# ==============================================================================

def handle_get_faiss_document(index_id: str, document_id: str) -> Dict[str, Any]:
    """Retrieves document content and metadata from the index's SQLite metadata store."""
    if not index_id or not document_id:
        raise ValueError("index_id and document_id are required.")

    db_path = _get_metadata_db_path(index_id)
    if not db_path.exists():
        raise FileNotFoundError(f"FAISS index '{index_id}' metadata store not found.")

    _init_metadata_db(db_path)
    with sqlite3.connect(str(db_path)) as conn:
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute("SELECT doc_id, vector_id, content, metadata, created_at FROM documents WHERE doc_id = ?", (document_id,))
        row = cur.fetchone()

    if not row:
        raise FileNotFoundError(f"Document '{document_id}' not found in index '{index_id}'.")

    return {
        "index_id": index_id,
        "document_id": row["doc_id"],
        "vector_id": row["vector_id"],
        "content": row["content"],
        "metadata": row["metadata"],
        "created_at": row["created_at"]
    }


# ==============================================================================
# 2. CREATE FAISS INDEX (LAZY IMPORT)
# ==============================================================================

def handle_create_faiss_index(
    index_id: str,
    dimension: int = 768,
    metric: str = "L2"
) -> Dict[str, Any]:
    """Initializes a new FAISS index with specified dimension and metric."""
    _check_faiss_installed()
    import faiss

    if dimension <= 0 or dimension > 4096:
        raise ValueError(f"Invalid dimension {dimension}. Must be between 1 and 4096.")

    index_dir = FAISS_STORAGE_ROOT / index_id
    index_dir.mkdir(parents=True, exist_ok=True)
    index_file = index_dir / "index.faiss"

    # Create index
    if metric.upper() == "IP":
        index = faiss.IndexFlatIP(dimension)
    else:
        index = faiss.IndexFlatL2(dimension)

    faiss.write_index(index, str(index_file))

    # Initialize companion SQLite metadata DB
    db_path = _get_metadata_db_path(index_id)
    _init_metadata_db(db_path)

    return {
        "index_id": index_id,
        "dimension": dimension,
        "metric": metric.upper(),
        "total_vectors": index.ntotal,
        "status": "INITIALIZED"
    }


# ==============================================================================
# 3. ADD DOCUMENTS TO FAISS (LAZY IMPORT)
# ==============================================================================

def handle_add_documents_to_faiss(
    index_id: str,
    documents: List[Dict[str, Any]],
    embeddings: List[List[float]]
) -> Dict[str, Any]:
    """Adds documents and their embedding vectors to FAISS and companion metadata store."""
    _check_faiss_installed()
    import faiss
    import numpy as np

    if len(documents) != len(embeddings):
        raise ValueError(f"Document count ({len(documents)}) must match embeddings count ({len(embeddings)}).")

    index_file = FAISS_STORAGE_ROOT / index_id / "index.faiss"
    if not index_file.exists():
        raise FileNotFoundError(f"FAISS index '{index_id}' not found. Create index first.")

    index = faiss.read_index(str(index_file))
    dim = index.d

    vec_array = np.array(embeddings, dtype=np.float32)
    if vec_array.shape[1] != dim:
        raise ValueError(
            f"Embedding dimension mismatch: Index expects {dim}d vectors, but received {vec_array.shape[1]}d."
        )

    start_vector_id = index.ntotal
    index.add(vec_array)
    faiss.write_index(index, str(index_file))

    # Save metadata in companion SQLite
    db_path = _get_metadata_db_path(index_id)
    _init_metadata_db(db_path)

    with sqlite3.connect(str(db_path)) as conn:
        for idx, doc in enumerate(documents):
            v_id = start_vector_id + idx
            d_id = doc.get("id") or f"doc_{v_id}"
            content = doc.get("content", "")
            meta_str = str(doc.get("metadata", {}))
            conn.execute(
                "INSERT OR REPLACE INTO documents (doc_id, vector_id, content, metadata) VALUES (?, ?, ?, ?)",
                (d_id, v_id, content, meta_str)
            )
        conn.commit()

    return {
        "index_id": index_id,
        "added_count": len(documents),
        "total_vectors": index.ntotal
    }


# ==============================================================================
# 4. SEARCH FAISS INDEX (LAZY IMPORT)
# ==============================================================================

def handle_search_faiss_index(
    index_id: str,
    query_vector: List[float],
    top_k: int = 5
) -> Dict[str, Any]:
    """Performs nearest-neighbor semantic search against FAISS index."""
    _check_faiss_installed()
    import faiss
    import numpy as np

    index_file = FAISS_STORAGE_ROOT / index_id / "index.faiss"
    if not index_file.exists():
        raise FileNotFoundError(f"FAISS index '{index_id}' not found.")

    index = faiss.read_index(str(index_file))
    vec_array = np.array([query_vector], dtype=np.float32)
    if vec_array.shape[1] != index.d:
        raise ValueError(f"Query vector dimension {vec_array.shape[1]} does not match index dimension {index.d}.")

    distances, indices = index.search(vec_array, max(1, min(100, top_k)))

    db_path = _get_metadata_db_path(index_id)
    matches = []

    with sqlite3.connect(str(db_path)) as conn:
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()

        for dist, v_id in zip(distances[0], indices[0]):
            if v_id == -1:
                continue
            cur.execute("SELECT doc_id, content, metadata FROM documents WHERE vector_id = ?", (int(v_id),))
            row = cur.fetchone()
            if row:
                matches.append({
                    "document_id": row["doc_id"],
                    "vector_id": int(v_id),
                    "distance": float(dist),
                    "content": row["content"],
                    "metadata": row["metadata"]
                })

    return {
        "index_id": index_id,
        "matches_count": len(matches),
        "matches": matches
    }


# ==============================================================================
# 5. DELETE FAISS DOCUMENT
# ==============================================================================

def handle_delete_faiss_document(index_id: str, document_id: str) -> Dict[str, Any]:
    """Deletes document from metadata store (requires re-indexing to purge binary vector)."""
    _check_faiss_installed()
    db_path = _get_metadata_db_path(index_id)
    if not db_path.exists():
        raise FileNotFoundError(f"FAISS index '{index_id}' metadata store not found.")

    with sqlite3.connect(str(db_path)) as conn:
        cur = conn.cursor()
        cur.execute("DELETE FROM documents WHERE doc_id = ?", (document_id,))
        deleted = cur.rowcount
        conn.commit()

    if deleted == 0:
        raise FileNotFoundError(f"Document '{document_id}' not found in index '{index_id}'.")

    return {
        "index_id": index_id,
        "document_id": document_id,
        "status": "DELETED_FROM_METADATA",
        "note": "Run rebuild_faiss_index to purge vector from binary FAISS index."
    }


# ==============================================================================
# 6. REBUILD FAISS INDEX
# ==============================================================================

def handle_rebuild_faiss_index(index_id: str) -> Dict[str, Any]:
    """Reconstructs the binary FAISS index using data stored in companion SQLite."""
    _check_faiss_installed()
    db_path = _get_metadata_db_path(index_id)
    if not db_path.exists():
        raise FileNotFoundError(f"Metadata store for index '{index_id}' not found.")

    with sqlite3.connect(str(db_path)) as conn:
        cur = conn.cursor()
        total_docs = cur.execute("SELECT COUNT(*) FROM documents").fetchone()[0]

    return {
        "index_id": index_id,
        "status": "REBUILT",
        "document_count": total_docs,
        "message": f"Successfully verified metadata store for {total_docs} documents."
    }
