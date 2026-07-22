import { describe, expect, it } from "vitest";
import { toSafeProjectDto } from "@/lib/projectDto";
describe("toSafeProjectDto", () => {
  it("never serializes legacy private storage keys", () => {
    const result = toSafeProjectDto({
      id: "project-1", name: "Safe project", pdfKey: "predictable.pdf", previewKey: "predictable.webp",
    });
    expect(result).toEqual({ id: "project-1", name: "Safe project", hasPdf: true, hasPreview: true });
    expect("pdfKey" in result).toBe(false);
    expect("previewKey" in result).toBe(false);
  });
});
