export const STORAGE_SECURITY_EVENTS = [
  "access-granted", "access-denied", "upload-created", "upload-rejected",
  "object-ready", "deletion-queued", "deletion-completed", "reconciliation-completed",
] as const;
export type StorageSecurityEvent = (typeof STORAGE_SECURITY_EVENTS)[number];
type SafeValue = number | boolean | null;
const SAFE_DETAIL_KEYS = new Set([
  "durationMs", "byteLength", "partCount", "attempt", "referenceCount", "objectCount", "success",
]);

export function safeStorageLogDetails(details: Record<string, unknown>) {
  const safe: Record<string, SafeValue> = {};
  for (const [key, value] of Object.entries(details)) {
    if (
      SAFE_DETAIL_KEYS.has(key) &&
      (value === null || typeof value === "number" || typeof value === "boolean")
    ) {
      safe[key] = value;
    }
  }
  return safe;
}
export function logStorageSecurityEvent(event: StorageSecurityEvent, details: Record<string, unknown> = {}) {
  console.info("[storage-security]", event, safeStorageLogDetails(details));
}
