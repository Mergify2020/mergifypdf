import { describe, expect, it } from "vitest";
import {
  chooseSecureUploadPlan,
  expectedPartByteLength,
  MIB,
  SecureUploadError,
  validateCompletedParts,
  validatePdfUploadIntent,
} from "@/lib/secureUploadPolicy";

const sha = "a".repeat(64);

describe("secure upload policy", () => {
  it("accepts only bounded PDF intents with a SHA-256 digest", () => {
    expect(validatePdfUploadIntent({
      projectId: "project_12345",
      fileName: "drawing.pdf",
      contentType: "application/pdf",
      byteLength: 1024,
      sha256: sha,
    })).toMatchObject({ byteLength: 1024, sha256: sha });

    for (const body of [
      { projectId: "project_12345", fileName: "drawing.exe", contentType: "application/pdf", byteLength: 1, sha256: sha },
      { projectId: "project_12345", fileName: "drawing.pdf", contentType: "text/html", byteLength: 1, sha256: sha },
      { projectId: "project_12345", fileName: "drawing.pdf", contentType: "application/pdf", byteLength: 0, sha256: sha },
      { projectId: "project_12345", fileName: "drawing.pdf", contentType: "application/pdf", byteLength: 1, sha256: "bad" },
    ]) {
      expect(() => validatePdfUploadIntent(body)).toThrow(SecureUploadError);
    }
  });

  it("uses multipart uploads above 64 MiB and calculates the final part exactly", () => {
    expect(chooseSecureUploadPlan(64 * MIB).mode).toBe("SINGLE");
    const plan = chooseSecureUploadPlan(65 * MIB);
    expect(plan).toMatchObject({ mode: "MULTIPART", partCount: 5 });
    expect(expectedPartByteLength(65 * MIB, plan.partSize!, plan.partCount!, 5)).toBe(MIB);
  });

  it("rejects missing, reordered, duplicated, or malformed completion parts", () => {
    const checksumSHA256 = "A".repeat(43) + "=";
    const valid = [1, 2].map((partNumber) => ({ partNumber, etag: `etagvalue${partNumber}`, checksumSHA256 }));
    expect(validateCompletedParts(valid, 2)).toHaveLength(2);
    expect(() => validateCompletedParts(valid.slice(0, 1), 2)).toThrow("All upload parts");
    expect(() => validateCompletedParts([valid[1], valid[0]], 2)).toThrow("Invalid upload part");
    expect(() => validateCompletedParts([{ ...valid[0], checksumSHA256: "bad" }, valid[1]], 2)).toThrow("Invalid upload part checksum");
  });
});
