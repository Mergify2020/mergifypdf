import { describe, expect, it } from "vitest";
import { assertQuarantinedPdfSafe } from "@/lib/securePdfInspection";

const sha256 = "b".repeat(64);
const safe = {
  actualSha256: sha256,
  byteLength: 42,
  pdfHeaderValid: true,
  qpdfValid: true,
  malwareDetected: false,
  dangerousActionsDetected: false,
};

describe("quarantined PDF inspection boundary", () => {
  it("promotes only a fully verified PDF", () => {
    expect(assertQuarantinedPdfSafe(safe, { sha256, byteLength: 42 })).toBe(true);
  });

  it.each([
    ["checksum", { actualSha256: "c".repeat(64) }],
    ["size", { byteLength: 43 }],
    ["structure", { qpdfValid: false }],
    ["malware", { malwareDetected: true }],
    ["active content", { dangerousActionsDetected: true }],
  ])("rejects unsafe %s results", (_label, change) => {
    expect(() => assertQuarantinedPdfSafe({ ...safe, ...change }, { sha256, byteLength: 42 })).toThrow();
  });
});
