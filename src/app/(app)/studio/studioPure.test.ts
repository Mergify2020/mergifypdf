import { describe, expect, it } from "vitest";
import {
  escapeHtml,
  formatSignedRotation,
  hexToRgb,
  hslToHex,
  hsvToHex,
  normalizeCssColor,
  normalizeRotation,
  normalizeTextSize,
  parseFontSize,
  rgbToHex,
  rgbToHsv,
  snapTextRotation,
  textToHtml,
} from "./studioPure";

describe("Studio pure utilities", () => {
  it("normalizes and snaps rotations", () => {
    expect(normalizeRotation(-90)).toBe(270);
    expect(formatSignedRotation(270)).toBe(-90);
    expect(snapTextRotation(43)).toBe(45);
    expect(snapTextRotation(40)).toBe(40);
  });

  it("clamps text sizes to supported half-point values", () => {
    expect(normalizeTextSize(12.26)).toBe(12.5);
    expect(normalizeTextSize(-5)).toBe(1);
    expect(normalizeTextSize(200)).toBe(96);
  });

  it("converts supported color formats", () => {
    expect(rgbToHex(255, 128, 0)).toBe("#ff8000");
    expect(hexToRgb("#ff0000")).toEqual({ r: 1, g: 0, b: 0 });
    expect(rgbToHsv(255, 0, 0)).toEqual({ h: 0, s: 100, v: 100 });
    expect(hsvToHex(120, 100, 100)).toBe("#00ff00");
    expect(hslToHex(240, 100, 50)).toBe("#0000ff");
    expect(normalizeCssColor("rgba(255, 0, 0, 0)")).toBeNull();
    expect(normalizeCssColor("#abc")).toBe("#aabbcc");
  });

  it("escapes rich text and parses point and pixel sizes", () => {
    expect(escapeHtml(`<p class=\"x\">Tom & Jerry's</p>`)).toBe(
      "&lt;p class=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/p&gt;",
    );
    expect(textToHtml("one\ntwo")).toBe("one<br>two");
    expect(parseFontSize("12pt", 9)).toBe(12);
    expect(parseFontSize("16px", 9)).toBe(12);
    expect(parseFontSize("inherit", 9)).toBe(9);
  });
});
