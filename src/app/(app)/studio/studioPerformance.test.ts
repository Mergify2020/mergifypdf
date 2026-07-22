import { describe, expect, it } from "vitest";
import {
  calculateBoundedRenderDimensions,
  selectPageWorkingSet,
} from "./studioPerformance";

describe("Studio massive-document performance policy", () => {
  it("caps construction-sheet canvases by pixels and dimensions", () => {
    const result = calculateBoundedRenderDimensions({
      pageWidth: 5000,
      pageHeight: 3500,
      desiredScale: 4,
      maximumPixels: 12_000_000,
      maximumDimension: 8192,
    });
    expect(result.pixels).toBeLessThanOrEqual(12_000_000);
    expect(result.width).toBeLessThanOrEqual(8192);
    expect(result.height).toBeLessThanOrEqual(8192);
    expect(result.scale).toBeLessThan(1);
  });

  it("never lets the minimum scale override a hard memory ceiling", () => {
    const result = calculateBoundedRenderDimensions({
      pageWidth: 30_000,
      pageHeight: 20_000,
      desiredScale: 4,
      maximumPixels: 2_000_000,
      maximumDimension: 4096,
      minimumScale: 0.5,
    });
    expect(result.pixels).toBeLessThanOrEqual(2_000_000);
    expect(result.width).toBeLessThanOrEqual(4096);
    expect(result.height).toBeLessThanOrEqual(4096);
    expect(result.scale).toBeLessThan(0.5);
  });

  it("keeps visible, nearby, and active-neighbor pages only", () => {
    const ids = Array.from({ length: 200 }, (_, index) => `page-${index}`);
    const working = selectPageWorkingSet({
      pageIds: ids,
      activeIndex: 100,
      visiblePageIds: ["page-101"],
      nearPageIds: ["page-98", "page-102"],
      activeRadius: 3,
    });
    expect([...working].sort()).toEqual(
      ["page-97", "page-98", "page-99", "page-100", "page-101", "page-102", "page-103"].sort(),
    );
    expect(working.has("page-0")).toBe(false);
  });
});
