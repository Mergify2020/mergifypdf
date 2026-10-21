import { describe, expect, it } from "vitest";
import { TEXT_FONT_OPTIONS } from "./studioFonts";

describe("Studio font configuration", () => {
  it("keeps all supported fonts and PDF variants available", () => {
    expect(Object.keys(TEXT_FONT_OPTIONS)).toEqual([
      "Inter",
      "Arial",
      "Roboto",
      "Poppins",
      "Times New Roman",
      "Courier New",
      "Georgia",
    ]);
    expect(TEXT_FONT_OPTIONS["Times New Roman"].pdf.variants.bold).toBe("Times-Bold");
    expect(TEXT_FONT_OPTIONS.Inter.pdf.type).toBe("custom");
  });
});
