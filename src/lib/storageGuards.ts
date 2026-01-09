const R2_PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL?.replace(/\/+$/, "");

export function assertR2AssetUrl(
  url: string | null | undefined,
  userId: string,
  label: string,
) {
  if (!url) return;
  if (!R2_PUBLIC_BASE_URL) {
    console.error(`[storage-guard] Missing R2_PUBLIC_BASE_URL for ${label}.`);
    throw new Error("R2 storage base URL is not configured");
  }
  if (url.startsWith("data:") || url.startsWith("file:") || url.startsWith("/")) {
    console.error(`[storage-guard] Non-R2 ${label} URL blocked: ${url}`);
    throw new Error(`Invalid ${label} storage location`);
  }
  const base = `${R2_PUBLIC_BASE_URL}/`;
  if (!url.startsWith(base)) {
    console.error(`[storage-guard] ${label} URL not in R2 base: ${url}`);
    throw new Error(`Invalid ${label} storage location`);
  }
  if (!url.includes(`/${userId}/`)) {
    console.error(`[storage-guard] ${label} URL not scoped to user ${userId}: ${url}`);
    throw new Error(`Invalid ${label} storage location`);
  }
}

export function isR2AssetUrl(url: string | null | undefined, userId: string) {
  if (!url || !R2_PUBLIC_BASE_URL) return false;
  if (url.startsWith("data:") || url.startsWith("file:") || url.startsWith("/")) {
    return false;
  }
  const base = `${R2_PUBLIC_BASE_URL}/`;
  if (!url.startsWith(base)) return false;
  return url.includes(`/${userId}/`);
}
