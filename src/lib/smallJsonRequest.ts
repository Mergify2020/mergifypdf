import { SecureUploadError } from "@/lib/secureUploadPolicy";

export async function readSmallJson(req: Request, maxBytes = 32 * 1024) {
  const declaredLength = Number(req.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new SecureUploadError("REQUEST_TOO_LARGE", 413, "Upload request metadata is too large.");
  }
  const text = await req.text();
  if (Buffer.byteLength(text, "utf8") > maxBytes) {
    throw new SecureUploadError("REQUEST_TOO_LARGE", 413, "Upload request metadata is too large.");
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new SecureUploadError("INVALID_JSON", 400, "Invalid upload request.");
  }
}
