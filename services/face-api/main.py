from __future__ import annotations

import base64
import io
import os
from typing import Any

import numpy as np
import requests
from fastapi import FastAPI
from pydantic import BaseModel, Field
from PIL import Image

try:
    from psycopg import connect
except Exception:  # pragma: no cover
    connect = None

try:
    import insightface  # type: ignore
except Exception:  # pragma: no cover
    insightface = None

MODEL_NAME = os.getenv("FACE_MODEL_NAME", "buffalo_l")
MODEL_VERSION = os.getenv("FACE_MODEL_VERSION", "buffalo_l_v1")
FACE_DATABASE_URL = os.getenv("FACE_DATABASE_URL") or os.getenv("DATABASE_URL")
FACE_PROVIDERS = [
    provider.strip()
    for provider in os.getenv(
        "FACE_EXECUTION_PROVIDERS",
        "CUDAExecutionProvider,CPUExecutionProvider",
    ).split(",")
    if provider.strip()
]

app = FastAPI(title="Face API", version="1.0.0")

face_app = None
active_provider = None
if insightface is not None:
    for provider in FACE_PROVIDERS:
        try:
            face_app = insightface.app.FaceAnalysis(name=MODEL_NAME, providers=[provider])
            face_app.prepare(ctx_id=0, det_size=(640, 640))
            active_provider = provider
            break
        except Exception:
            face_app = None

    if face_app is None and "CPUExecutionProvider" not in FACE_PROVIDERS:
        try:
            face_app = insightface.app.FaceAnalysis(name=MODEL_NAME, providers=["CPUExecutionProvider"])
            face_app.prepare(ctx_id=0, det_size=(640, 640))
            active_provider = "CPUExecutionProvider"
        except Exception:
            face_app = None


class ExtractEmbeddingRequest(BaseModel):
    image_base64: str | None = None
    image_url: str | None = None


class SimilarCandidate(BaseModel):
    resident_id: str
    embedding: list[float]


class SearchSimilarRequest(BaseModel):
    embedding: list[float] = Field(min_length=512, max_length=512)
    top_k: int = 5
    candidates: list[SimilarCandidate] = Field(default_factory=list)
    resident_id: str | None = None
    scope: dict[str, str] | None = None


def _load_image(req: ExtractEmbeddingRequest) -> np.ndarray:
    if req.image_base64:
        payload = req.image_base64
        if "," in payload and payload.split(",", 1)[0].startswith("data:"):
            payload = payload.split(",", 1)[1]
        raw = base64.b64decode(payload)
    elif req.image_url:
        response = requests.get(req.image_url, timeout=10)
        response.raise_for_status()
        raw = response.content
    else:
        raise ValueError("Either image_base64 or image_url is required")

    img = Image.open(io.BytesIO(raw)).convert("RGB")
    return np.array(img)


def _quality_score(face: Any, image: np.ndarray) -> float:
    bbox = getattr(face, "bbox", None)
    if bbox is None or image.size == 0:
        return 0.0
    width = max(float(bbox[2] - bbox[0]), 1.0)
    height = max(float(bbox[3] - bbox[1]), 1.0)
    area_ratio = min((width * height) / float(image.shape[0] * image.shape[1]), 1.0)
    return round(max(0.0, min(area_ratio * 100.0, 100.0)), 2)


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    denom = (np.linalg.norm(a) * np.linalg.norm(b))
    if denom == 0:
        return 0.0
    return float(np.dot(a, b) / denom)


def _embedding_to_vector_literal(embedding: list[float]) -> str:
    if len(embedding) != 512:
        raise ValueError(f"Expected 512 dimensions, got {len(embedding)}")
    return "[" + ",".join(f"{float(value):.8f}" for value in embedding) + "]"


def _search_similar_from_db(req: SearchSimilarRequest) -> list[dict[str, Any]]:
    if not FACE_DATABASE_URL or connect is None:
        return []

    vector_literal = _embedding_to_vector_literal(req.embedding)
    filters = ['r."id" <> COALESCE(%s, r."id")']
    filter_params: list[Any] = [req.resident_id]

    scope = req.scope or {}
    zone_id = scope.get("zoneId")
    woreda_id = scope.get("woredaId")
    kebele_id = scope.get("kebeleId")

    if zone_id:
        filters.append('r."zoneId" = %s')
        filter_params.append(zone_id)
    if woreda_id:
        filters.append('r."woredaId" = %s')
        filter_params.append(woreda_id)
    if kebele_id:
        filters.append('r."kebeleId" = %s')
        filter_params.append(kebele_id)

    limit = max(int(req.top_k), 1)

    sql = f"""
        SELECT r."id" AS resident_id,
               (1 - (e."embedding" <=> %s::vector)) AS similarity
        FROM "ResidentFaceEmbedding" e
        JOIN "Resident" r ON r."id" = e."residentId"
        WHERE {" AND ".join(filters)}
        ORDER BY e."embedding" <=> %s::vector ASC
        LIMIT %s
    """
    params_for_query = [vector_literal, *filter_params, vector_literal, limit]

    with connect(FACE_DATABASE_URL) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params_for_query)
            rows = cur.fetchall()

    return [
        {
            "residentId": row[0],
            "similarity": round(float(row[1]), 6),
        }
        for row in rows
    ]


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "model": MODEL_NAME,
        "modelVersion": MODEL_VERSION,
        "insightfaceLoaded": face_app is not None,
        "requestedProviders": FACE_PROVIDERS,
        "activeProvider": active_provider,
    }


@app.post("/extract-embedding")
def extract_embedding(req: ExtractEmbeddingRequest) -> dict[str, Any]:
    try:
        if face_app is None:
            return {
                "ok": False,
                "error": "InsightFace model is not loaded",
                "faceCount": 0,
                "quality": 0,
                "modelVersion": MODEL_VERSION,
            }

        image = _load_image(req)
        faces = face_app.get(image)
        if not faces:
            return {
                "ok": False,
                "error": "No face detected",
                "faceCount": 0,
                "quality": 0,
                "modelVersion": MODEL_VERSION,
            }

        best_face = max(faces, key=lambda f: _quality_score(f, image))
        embedding = np.asarray(best_face.embedding, dtype=np.float32)

        return {
            "ok": True,
            "embedding": embedding.tolist(),
            "quality": _quality_score(best_face, image),
            "faceCount": len(faces),
            "modelVersion": MODEL_VERSION,
        }
    except Exception as exc:  # pragma: no cover
        return {
            "ok": False,
            "error": str(exc),
            "faceCount": 0,
            "quality": 0,
            "modelVersion": MODEL_VERSION,
        }


@app.post("/search-similar")
def search_similar(req: SearchSimilarRequest) -> dict[str, Any]:
    try:
        db_matches = _search_similar_from_db(req)
        if db_matches:
            return {
                "ok": True,
                "matches": db_matches,
                "modelVersion": MODEL_VERSION,
            }
    except Exception:
        # If DB search is unavailable, fall back to request-supplied candidates.
        pass

    query = np.asarray(req.embedding, dtype=np.float32)

    scored = []
    for candidate in req.candidates:
        vector = np.asarray(candidate.embedding, dtype=np.float32)
        sim = _cosine_similarity(query, vector)
        scored.append(
            {
                "residentId": candidate.resident_id,
                "similarity": round(sim, 6),
            }
        )

    scored.sort(key=lambda item: item["similarity"], reverse=True)
    return {
        "ok": True,
        "matches": scored[: max(req.top_k, 1)],
        "modelVersion": MODEL_VERSION,
    }
