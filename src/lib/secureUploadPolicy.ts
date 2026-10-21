export const MIB = 1024 * 1024;
export const DEFAULT_SECURE_UPLOAD_MAX_BYTES = 1024 * MIB;
export const DEFAULT_SECURE_STORAGE_USER_QUOTA_BYTES = 20 * 1024 * MIB;
export const SINGLE_UPLOAD_MAX_BYTES = 64 * MIB;
export const MULTIPART_PART_SIZE = 16 * MIB;
export const MAX_MULTIPART_PARTS = 10_000;
export const MAX_ACTIVE_UPLOADS = 3;
export const UPLOAD_SESSION_TTL_MS = 24 * 60 * 60 * 1000;
export const SIGNED_UPLOAD_TTL_SECONDS = 5 * 60;

type RuntimeEnv = Record<string, string | undefined>;

export class SecureUploadError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "SecureUploadError";
  }
}

function boundedInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) return fallback;
  return parsed;
}

export function getSecureUploadLimits(env: RuntimeEnv = process.env) {
  return {
    maxUploadBytes: boundedInteger(
      env.SECURE_UPLOAD_MAX_BYTES,
      DEFAULT_SECURE_UPLOAD_MAX_BYTES,
      5 * MIB,
      5 * 1024 * MIB,
    ),
    userQuotaBytes: boundedInteger(
      env.SECURE_STORAGE_USER_QUOTA_BYTES,
      DEFAULT_SECURE_STORAGE_USER_QUOTA_BYTES,
      100 * MIB,
      1024 * 1024 * MIB,
    ),
  };
}

export function normalizeSha256Hex(value: unknown) {
  if (typeof value !== "string" || !/^[a-fA-F0-9]{64}$/.test(value)) {
    throw new SecureUploadError("INVALID_CHECKSUM", 400, "A valid SHA-256 checksum is required.");
  }
  return value.toLowerCase();
}

export function sha256HexToBase64(value: string) {
  const normalized = normalizeSha256Hex(value);
  return Buffer.from(normalized, "hex").toString("base64");
}

export function validatePdfUploadIntent(
  body: unknown,
  env: RuntimeEnv = process.env,
) {
  if (!body || typeof body !== "object") {
    throw new SecureUploadError("INVALID_REQUEST", 400, "Invalid upload request.");
  }
  const record = body as Record<string, unknown>;
  const projectId = typeof record.projectId === "string" ? record.projectId.trim() : "";
  const fileName = typeof record.fileName === "string" ? record.fileName.trim() : "";
  const contentType = typeof record.contentType === "string" ? record.contentType.trim().toLowerCase() : "";
  const byteLength = typeof record.byteLength === "number" ? record.byteLength : Number.NaN;
  const sha256 = normalizeSha256Hex(record.sha256);

  if (!/^[A-Za-z0-9_-]{8,128}$/.test(projectId)) {
    throw new SecureUploadError("INVALID_PROJECT", 400, "Invalid project.");
  }
  if (!fileName || fileName.length > 255 || !fileName.toLowerCase().endsWith(".pdf")) {
    throw new SecureUploadError("INVALID_FILE_NAME", 400, "Select a PDF file.");
  }
  if (contentType !== "application/pdf") {
    throw new SecureUploadError("INVALID_CONTENT_TYPE", 400, "Only PDF uploads are accepted.");
  }

  const { maxUploadBytes } = getSecureUploadLimits(env);
  if (!Number.isSafeInteger(byteLength) || byteLength <= 0 || byteLength > maxUploadBytes) {
    throw new SecureUploadError("UPLOAD_TOO_LARGE", 413, "The PDF exceeds the upload limit.");
  }

  return { projectId, contentType, byteLength, sha256 };
}

export function validateIdempotencyKey(value: string | null) {
  const key = value?.trim() ?? "";
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(key)) {
    throw new SecureUploadError("INVALID_IDEMPOTENCY_KEY", 400, "A valid upload idempotency key is required.");
  }
  return key;
}

export function chooseSecureUploadPlan(byteLength: number) {
  if (byteLength <= SINGLE_UPLOAD_MAX_BYTES) {
    return { mode: "SINGLE" as const, partSize: null, partCount: null };
  }
  const partCount = Math.ceil(byteLength / MULTIPART_PART_SIZE);
  if (partCount > MAX_MULTIPART_PARTS) {
    throw new SecureUploadError("TOO_MANY_PARTS", 413, "The PDF requires too many upload parts.");
  }
  return { mode: "MULTIPART" as const, partSize: MULTIPART_PART_SIZE, partCount };
}

export function expectedPartByteLength(
  totalBytes: number,
  partSize: number,
  partCount: number,
  partNumber: number,
) {
  if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > partCount) {
    throw new SecureUploadError("INVALID_PART", 400, "Invalid upload part.");
  }
  return partNumber === partCount ? totalBytes - partSize * (partCount - 1) : partSize;
}

export function validatePartChecksum(value: unknown) {
  if (typeof value !== "string" || !/^[A-Za-z0-9+/]{43}=$/.test(value)) {
    throw new SecureUploadError("INVALID_PART_CHECKSUM", 400, "Invalid upload part checksum.");
  }
  return value;
}

export function validateCompletedParts(value: unknown, expectedCount: number) {
  if (!Array.isArray(value) || value.length !== expectedCount) {
    throw new SecureUploadError("INCOMPLETE_UPLOAD", 400, "All upload parts are required.");
  }
  return value.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new SecureUploadError("INVALID_PART", 400, "Invalid upload part.");
    }
    const item = entry as Record<string, unknown>;
    const partNumber = item.partNumber;
    const etag = typeof item.etag === "string" ? item.etag.trim() : "";
    const checksumSHA256 = validatePartChecksum(item.checksumSHA256);
    if (partNumber !== index + 1 || !/^"?[A-Za-z0-9+/=_-]{8,128}"?$/.test(etag)) {
      throw new SecureUploadError("INVALID_PART", 400, "Invalid upload part.");
    }
    return { partNumber, etag, checksumSHA256 };
  });
}
