import { describe, expect, it } from "vitest";
import { pdfJsSecureSource, type SecurePdfReadAccess } from "@/lib/securePdfReadClient";

describe("secure PDF.js read source", () => {
  it("keeps the token out of the URL and enables bounded lazy ranges", () => {
    const access: SecurePdfReadAccess = {
      readSessionId: "read-session-1",
      url: "/api/storage/read/read-session-1",
      token: "secret-header-token",
      operation: "VIEW",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      absoluteExpiresAt: new Date(Date.now() + 120_000).toISOString(),
      assetId: "asset-1",
      byteLength: 500_000_000,
      sha256: "a".repeat(64),
      contentType: "application/pdf",
    };
    const source = pdfJsSecureSource(access);
    expect(source.url).not.toContain(access.token);
    expect(source.httpHeaders).toEqual({ "X-Storage-Read-Token": access.token });
    expect(source.rangeChunkSize).toBe(4 * 1024 * 1024);
    expect(source).toMatchObject({
      disableRange: false,
      disableStream: true,
      disableAutoFetch: true,
      withCredentials: true,
    });
  });
});
