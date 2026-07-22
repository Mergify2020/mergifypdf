import { describe, expect, it } from "vitest";
import { extractProjectRotationFromData, getProjectCoverPreview } from "./studioProjectData";

describe("Studio project data", () => {
  it("accepts only embedded image cover previews", () => {
    expect(getProjectCoverPreview([])).toBeNull();
    expect(getProjectCoverPreview([{ preview: "https://example.test/cover.png" }] as never)).toBeNull();
    expect(getProjectCoverPreview([{ preview: "data:image/webp;base64,abc" }] as never)).toBe(
      "data:image/webp;base64,abc",
    );
  });

  it("normalizes the first saved page rotation", () => {
    expect(extractProjectRotationFromData({ pages: [{ rotation: -90 }] })).toBe(270);
    expect(extractProjectRotationFromData({ pages: [] })).toBe(0);
    expect(extractProjectRotationFromData(null)).toBe(0);
  });
});
