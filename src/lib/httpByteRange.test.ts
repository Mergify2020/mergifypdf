import { describe, expect, it } from "vitest";
import {
  ifRangeAllowsRange,
  parseSingleByteRange,
  strongPdfEtag,
} from "@/lib/httpByteRange";

describe("HTTP PDF byte ranges", () => {
  it.each([
    ["bytes=0-99", { start: 0, end: 99, length: 100, contentRange: "bytes 0-99/1000" }],
    ["bytes=900-", { start: 900, end: 999, length: 100, contentRange: "bytes 900-999/1000" }],
    ["bytes=-128", { start: 872, end: 999, length: 128, contentRange: "bytes 872-999/1000" }],
    ["bytes=950-5000", { start: 950, end: 999, length: 50, contentRange: "bytes 950-999/1000" }],
  ])("resolves one satisfiable range: %s", (header, expected) => {
    expect(parseSingleByteRange(header, 1000)).toMatchObject(expected);
  });

  it.each([
    "bytes=1000-",
    "bytes=100-99",
    "bytes=0-1,4-5",
    "items=0-1",
    "bytes=-0",
    "bytes=-",
  ])("rejects malformed or unsatisfiable ranges: %s", (header) => {
    expect(() => parseSingleByteRange(header, 1000)).toThrowError(expect.objectContaining({ status: 416 }));
  });

  it("uses the verified checksum as a strong validator", () => {
    const etag = strongPdfEtag("a".repeat(64));
    expect(etag).toBe(`"sha256-${"a".repeat(64)}"`);
    expect(ifRangeAllowsRange(etag, etag)).toBe(true);
    expect(ifRangeAllowsRange('"older"', etag)).toBe(false);
  });
});
