export interface ExtractEmbeddingInput {
  imageBase64?: string;
  imageUrl?: string;
}

export interface ExtractEmbeddingResponse {
  ok: boolean;
  embedding?: number[];
  quality?: number;
  faceCount: number;
  error?: string;
  modelVersion?: string;
}

export interface SearchSimilarInput {
  embedding: number[];
  topK?: number;
  residentId?: string;
  scope?: {
    zoneId?: string;
    woredaId?: string;
    kebeleId?: string;
  };
}

export interface SearchSimilarMatch {
  residentId: string;
  similarity: number;
}

export interface SearchSimilarResponse {
  ok: boolean;
  matches: SearchSimilarMatch[];
  modelVersion?: string;
}

const FACE_API_URL = process.env.FACE_API_URL ?? "http://127.0.0.1:8000";
const FACE_TIMEOUT_MS = Number(process.env.FACE_API_TIMEOUT_MS ?? 8000);
const FACE_RETRIES = Number(process.env.FACE_API_RETRIES ?? 2);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postJsonWithRetry<T>(path: string, payload: unknown): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= FACE_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FACE_TIMEOUT_MS);
    try {
      const response = await fetch(`${FACE_API_URL}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Face API ${path} failed with ${response.status}`);
      }

      return (await response.json()) as T;
    } catch (error) {
      lastError = error;
      if (attempt < FACE_RETRIES) {
        await sleep(300 * (attempt + 1));
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Face API request failed");
}

export async function extractEmbedding(input: ExtractEmbeddingInput): Promise<ExtractEmbeddingResponse> {
  if (!input.imageBase64 && !input.imageUrl) {
    return { ok: false, error: "Image is required", faceCount: 0 };
  }

  return postJsonWithRetry<ExtractEmbeddingResponse>("/extract-embedding", {
    image_base64: input.imageBase64,
    image_url: input.imageUrl,
  });
}

export async function searchSimilar(input: SearchSimilarInput): Promise<SearchSimilarResponse> {
  const topK = input.topK ?? Number(process.env.FACE_TOP_K ?? 5);
  return postJsonWithRetry<SearchSimilarResponse>("/search-similar", {
    embedding: input.embedding,
    top_k: topK,
    resident_id: input.residentId,
    scope: input.scope ?? null,
  });
}
