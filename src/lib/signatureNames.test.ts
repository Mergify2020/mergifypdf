import { describe, expect, it } from "vitest";
import { nextSignatureName } from "./signatureNames";

describe("nextSignatureName", () => {
  it("numbers a new signature after all existing signatures", () => {
    expect(nextSignatureName([{ name: "Alex" }, { name: "Signature 2" }])).toBe("Signature 3");
    expect(nextSignatureName([])).toBe("Signature 1");
  });

  it("avoids names already in use, ignoring case and whitespace", () => {
    expect(nextSignatureName([{ name: "signature 3 " }, { name: "Other" }])).toBe("Signature 4");
  });
});
