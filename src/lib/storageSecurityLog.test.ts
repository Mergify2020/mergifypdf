import { describe, expect, it, vi } from "vitest";
import { logStorageSecurityEvent, safeStorageLogDetails } from "@/lib/storageSecurityLog";
describe("storage security logging", () => {
  it("drops identifiers, URLs, keys, and error payloads", () => {
    expect(safeStorageLogDetails({
      durationMs: 12, success: false, userId: "secret", projectId: "secret",
      objectKey: "secret", url: "https://example.test/signed", error: new Error("secret"),
    })).toEqual({ durationMs: 12, success: false });
  });
  it("logs only the sanitized record", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    logStorageSecurityEvent("access-denied", { attempt: 2, assetId: "secret" });
    expect(spy).toHaveBeenCalledWith("[storage-security]", "access-denied", { attempt: 2 });
    spy.mockRestore();
  });
});
