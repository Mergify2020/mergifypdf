import { Sha256 } from "@aws-crypto/sha256-browser";

const HASH_CHUNK_BYTES = 8 * 1024 * 1024;
const SIGN_BATCH_SIZE = 20;
const UPLOAD_CONCURRENCY = 3;

type UploadPhase = "hashing" | "uploading" | "quarantined";

export type SecureUploadProgress = {
  phase: UploadPhase;
  completedBytes: number;
  totalBytes: number;
};

export type SecureUploadResumeState = {
  version: 1;
  idempotencyKey: string;
  uploadId?: string;
  fileFingerprint: string;
  completedParts: Record<number, { etag: string; checksumSHA256: string }>;
};

export type SecureUploadClientOptions = {
  projectId: string;
  signal?: AbortSignal;
  resumeState?: SecureUploadResumeState;
  onResumeState?: (state: SecureUploadResumeState) => void;
  onProgress?: (progress: SecureUploadProgress) => void;
};

type UploadSessionResponse = {
  uploadId: string;
  mode: "SINGLE" | "MULTIPART";
  status: string;
  partSize: number | null;
  partCount: number | null;
  single?: { url: string; headers: Record<string, string> };
};

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function hashBlob(
  blob: Blob,
  output: "hex" | "base64",
  signal?: AbortSignal,
  onBytes?: (bytes: number) => void,
) {
  const hash = new Sha256();
  let consumed = 0;
  while (consumed < blob.size) {
    signal?.throwIfAborted();
    const end = Math.min(consumed + HASH_CHUNK_BYTES, blob.size);
    hash.update(new Uint8Array(await blob.slice(consumed, end).arrayBuffer()));
    consumed = end;
    onBytes?.(consumed);
  }
  const digest = await hash.digest();
  return output === "hex" ? bytesToHex(digest) : bytesToBase64(digest);
}

function newIdempotencyKey() {
  return crypto.randomUUID().replaceAll("-", "");
}

function fingerprint(file: File) {
  return [file.name, file.size, file.lastModified, file.type].join(":");
}

async function jsonRequest<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
  const body = await response.json().catch(() => null) as { error?: string } | null;
  if (!response.ok) throw new Error(body?.error ?? "Secure upload request failed.");
  return body as T;
}

function emitState(
  state: SecureUploadResumeState,
  callback?: (state: SecureUploadResumeState) => void,
) {
  callback?.({ ...state, completedParts: { ...state.completedParts } });
}

export async function uploadPdfSecurely(file: File, options: SecureUploadClientOptions) {
  if (!file.name.toLowerCase().endsWith(".pdf") || file.type !== "application/pdf") {
    throw new Error("Select a PDF file.");
  }
  const fileFingerprint = fingerprint(file);
  if (options.resumeState && options.resumeState.fileFingerprint !== fileFingerprint) {
    throw new Error("The selected file does not match the resumable upload.");
  }
  const state: SecureUploadResumeState = options.resumeState
    ? { ...options.resumeState, completedParts: { ...options.resumeState.completedParts } }
    : { version: 1, idempotencyKey: newIdempotencyKey(), fileFingerprint, completedParts: {} };
  emitState(state, options.onResumeState);

  const sha256 = await hashBlob(file, "hex", options.signal, (completedBytes) => {
    options.onProgress?.({ phase: "hashing", completedBytes, totalBytes: file.size });
  });
  const session = await jsonRequest<UploadSessionResponse>("/api/uploads", {
    method: "POST",
    signal: options.signal,
    headers: { "idempotency-key": state.idempotencyKey },
    body: JSON.stringify({
      projectId: options.projectId,
      fileName: file.name,
      contentType: file.type,
      byteLength: file.size,
      sha256,
    }),
  });
  state.uploadId = session.uploadId;
  emitState(state, options.onResumeState);

  if (session.mode === "SINGLE") {
    if (!session.single) throw new Error("Single-file upload was not initialized.");
    const response = await fetch(session.single.url, {
      method: "PUT",
      headers: session.single.headers,
      body: file,
      signal: options.signal,
    });
    if (!response.ok) throw new Error("Private PDF upload failed.");
    options.onProgress?.({ phase: "uploading", completedBytes: file.size, totalBytes: file.size });
    const result = await jsonRequest<{ status: string }>(`/api/uploads/${session.uploadId}/complete`, {
      method: "POST",
      signal: options.signal,
      body: "{}",
    });
    options.onProgress?.({ phase: "quarantined", completedBytes: file.size, totalBytes: file.size });
    return result;
  }

  if (!session.partSize || !session.partCount) throw new Error("Multipart upload was not initialized.");
  const pending = Array.from({ length: session.partCount }, (_, index) => index + 1)
    .filter((partNumber) => !state.completedParts[partNumber]);
  let uploadedBytes = Object.keys(state.completedParts).reduce((total, key) => {
    const partNumber = Number(key);
    const start = (partNumber - 1) * session.partSize!;
    return total + Math.min(session.partSize!, file.size - start);
  }, 0);

  for (let offset = 0; offset < pending.length; offset += SIGN_BATCH_SIZE) {
    const batch = pending.slice(offset, offset + SIGN_BATCH_SIZE);
    const prepared: Array<{ partNumber: number; blob: Blob; checksumSHA256: string }> = [];
    for (const partNumber of batch) {
      const start = (partNumber - 1) * session.partSize!;
      const end = Math.min(start + session.partSize!, file.size);
      const blob = file.slice(start, end);
      prepared.push({
        partNumber,
        blob,
        checksumSHA256: await hashBlob(blob, "base64", options.signal),
      });
    }
    const signed = await jsonRequest<{
      parts: Array<{ partNumber: number; url: string; headers: Record<string, string> }>;
    }>(`/api/uploads/${session.uploadId}/parts`, {
      method: "POST",
      signal: options.signal,
      body: JSON.stringify({
        parts: prepared.map(({ partNumber, checksumSHA256 }) => ({ partNumber, checksumSHA256 })),
      }),
    });
    const queue = [...prepared];
    const workers = Array.from({ length: Math.min(UPLOAD_CONCURRENCY, queue.length) }, async () => {
      while (queue.length > 0) {
        options.signal?.throwIfAborted();
        const part = queue.shift();
        if (!part) return;
        const instruction = signed.parts.find((item) => item.partNumber === part.partNumber);
        if (!instruction) throw new Error("An upload part URL was missing.");
        const response = await fetch(instruction.url, {
          method: "PUT",
          headers: instruction.headers,
          body: part.blob,
          signal: options.signal,
        });
        const etag = response.headers.get("etag");
        if (!response.ok || !etag) throw new Error("A private PDF upload part failed.");
        state.completedParts[part.partNumber] = { etag, checksumSHA256: part.checksumSHA256 };
        uploadedBytes += part.blob.size;
        emitState(state, options.onResumeState);
        options.onProgress?.({ phase: "uploading", completedBytes: uploadedBytes, totalBytes: file.size });
      }
    });
    await Promise.all(workers);
  }

  const parts = Array.from({ length: session.partCount }, (_, index) => {
    const partNumber = index + 1;
    const completed = state.completedParts[partNumber];
    if (!completed) throw new Error("The resumable upload is incomplete.");
    return { partNumber, ...completed };
  });
  const result = await jsonRequest<{ status: string }>(`/api/uploads/${session.uploadId}/complete`, {
    method: "POST",
    signal: options.signal,
    body: JSON.stringify({ parts }),
  });
  options.onProgress?.({ phase: "quarantined", completedBytes: file.size, totalBytes: file.size });
  return result;
}
