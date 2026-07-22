import { describe, expect, it } from "vitest";
import { formatFileSize } from "./formatFileSize";

describe("formatFileSize", () => {
  it("rejects invalid sizes", () => {
    expect(formatFileSize(-1)).toBeNull();
    expect(formatFileSize(Number.NaN)).toBeNull();
    expect(formatFileSize(undefined)).toBeNull();
  });

  it("formats byte units consistently", () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(1024)).toBe("1.00 KB");
    expect(formatFileSize(10 * 1024 * 1024)).toBe("10.0 MB");
  });
});
