import { describe, expect, it } from "vitest";
import { createPrivateObjectKey, createStorageNamespace } from "@/lib/storageModel";
describe("secure storage identifiers", () => {
  it("creates opaque keys without customer identifiers", () => {
    const key = createPrivateObjectKey(
      { environment: "preview", bucketClass: "source", kind: "pdf-source" },
      () => Buffer.alloc(32, 7),
    );
    expect(key).toMatch(/^v2\/preview\/source\/pdf-source\/[A-Za-z0-9_-]{43}$/);
    expect(key).not.toContain("project");
    expect(key).not.toContain("@");
  });
  it("creates an opaque browser storage namespace", () => {
    expect(createStorageNamespace(() => Buffer.alloc(24, 9))).toMatch(/^[A-Za-z0-9_-]{32}$/);
  });
  it("rejects insufficient entropy", () => {
    expect(() => createPrivateObjectKey(
      { environment: "development", bucketClass: "incoming", kind: "pdf-source" },
      () => Buffer.alloc(8),
    )).toThrow(/256 bits/);
  });
});
