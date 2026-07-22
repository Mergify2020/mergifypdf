export type SecurePdfReadOperation = "view" | "download" | "print" | "sign";

export type SecurePdfReadAccess = {
  readSessionId: string;
  url: string;
  token: string;
  operation: string;
  expiresAt: string;
  absoluteExpiresAt: string;
  assetId: string;
  byteLength: number;
  sha256: string;
  contentType: "application/pdf";
};

export async function createSecurePdfReadAccess(input: {
  projectId: string;
  assetId?: string;
  operation?: SecurePdfReadOperation;
  signal?: AbortSignal;
}) {
  const response = await fetch(`/api/projects/${encodeURIComponent(input.projectId)}/read-session`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      assetId: input.assetId,
      operation: input.operation ?? "view",
    }),
    signal: input.signal,
  });
  const body = await response.json().catch(() => null) as SecurePdfReadAccess | { error?: string } | null;
  if (!response.ok) {
    throw new Error(body && "error" in body ? body.error ?? "Unable to open the PDF." : "Unable to open the PDF.");
  }
  return body as SecurePdfReadAccess;
}

export function pdfJsSecureSource(access: SecurePdfReadAccess) {
  return {
    url: access.url,
    httpHeaders: { "X-Storage-Read-Token": access.token },
    withCredentials: true,
    rangeChunkSize: 4 * 1024 * 1024,
    disableRange: false,
    disableStream: true,
    disableAutoFetch: true,
  };
}

export async function revokeSecurePdfReadAccess(
  access: SecurePdfReadAccess,
  signal?: AbortSignal,
) {
  await fetch(access.url, {
    method: "DELETE",
    headers: { "X-Storage-Read-Token": access.token },
    signal,
  }).catch(() => undefined);
}

export class SecurePdfReadAccessManager {
  private access: SecurePdfReadAccess | null = null;

  constructor(private readonly input: {
    projectId: string;
    assetId?: string;
    operation?: SecurePdfReadOperation;
  }) {}

  async open(signal?: AbortSignal) {
    const previous = this.access;
    this.access = await createSecurePdfReadAccess({ ...this.input, signal });
    if (previous) void revokeSecurePdfReadAccess(previous);
    return this.access;
  }

  currentPdfJsSource() {
    if (!this.access) throw new Error("The secure PDF session has not been opened.");
    return pdfJsSecureSource(this.access);
  }

  async renewIfNeeded(signal?: AbortSignal, thresholdMs = 2 * 60 * 1000) {
    if (!this.access || Date.parse(this.access.expiresAt) - Date.now() <= thresholdMs) {
      return this.open(signal);
    }
    return this.access;
  }

  async close(signal?: AbortSignal) {
    const current = this.access;
    this.access = null;
    if (current) await revokeSecurePdfReadAccess(current, signal);
  }
}
