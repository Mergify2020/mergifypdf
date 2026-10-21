import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadPdfSecurely } from "@/lib/secureUploadClient";

describe("secure browser upload client", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("hashes a PDF, uses only the write URL, and completes quarantine", async () => {
    const requests: Array<[string, RequestInit]> = [];
    const fetchMock = vi.fn(async (url: string, init: RequestInit = {}) => {
      requests.push([url, init]);
      if (url === "/api/uploads") {
        return new Response(JSON.stringify({
          uploadId: "upload-1",
          mode: "SINGLE",
          status: "ACTIVE",
          partSize: null,
          partCount: null,
          single: {
            url: "https://write-only.invalid/upload",
            headers: { "x-amz-checksum-sha256": "signed-checksum" },
          },
        }), { status: 201, headers: { "content-type": "application/json" } });
      }
      if (url === "https://write-only.invalid/upload") return new Response(null, { status: 200 });
      return new Response(JSON.stringify({ status: "QUARANTINED" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("crypto", { randomUUID: () => "12345678-1234-1234-1234-123456789012" });

    const file = new File(["%PDF-1.7"], "plans.pdf", {
      type: "application/pdf",
      lastModified: 123,
    });
    await expect(uploadPdfSecurely(file, { projectId: "project_12345" }))
      .resolves.toEqual({ status: "QUARANTINED" });

    expect(requests.map(([url]) => url)).toEqual([
      "/api/uploads",
      "https://write-only.invalid/upload",
      "/api/uploads/upload-1/complete",
    ]);
    const intent = JSON.parse(String(requests[0][1].body));
    expect(intent).toMatchObject({
      projectId: "project_12345",
      fileName: "plans.pdf",
      contentType: "application/pdf",
      byteLength: 8,
    });
    expect(intent.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(requests)).not.toContain("objectKey");
  });
});
