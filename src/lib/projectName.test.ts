import { describe, expect, it } from "vitest";
import {
  deriveProjectNameFromFilename,
  projectNameToDisplay,
  projectNameToFile,
  sanitizeProjectName,
} from "./projectName";

describe("project names", () => {
  it("uses a safe default for blank names", () => {
    expect(sanitizeProjectName("   ")).toBe("Untitled Project");
  });

  it("removes the PDF extension when deriving a project name", () => {
    expect(deriveProjectNameFromFilename(" Contract.PDF ")).toBe("Contract");
  });

  it("adds exactly one display extension", () => {
    expect(projectNameToDisplay("Contract")).toBe("Contract.pdf");
    expect(projectNameToDisplay("Contract.PDF")).toBe("Contract.PDF");
  });

  it("sanitizes downloaded filenames", () => {
    expect(projectNameToFile("Client / Contract")).toBe("Client.Contract.pdf");
  });
});
