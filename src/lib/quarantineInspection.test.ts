import { createHash } from "node:crypto";
import { copyFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { afterEach, describe, expect, it } from "vitest";
import {
  inspectQuarantinedPdf,
  QuarantineInspectionError,
} from "@/lib/quarantineInspection";

const temporaryDirectories: string[] = [];

async function temporaryRoot() {
  const directory = await mkdtemp(join(tmpdir(), "mergifypdf-inspection-test-"));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

function sha256(bytes: Buffer) {
  return createHash("sha256").update(bytes).digest("hex");
}

function safeToolRunner() {
  return async (command: string, args: string[]) => {
    if (command === "qpdf" && args[0] === "--show-encryption") {
      return { stdout: "File is not encrypted", stderr: "" };
    }
    if (command === "qpdf" && args[0] === "--qdf") {
      await copyFile(args.at(-2)!, args.at(-1)!);
    }
    return { stdout: "", stderr: "" };
  };
}

describe("streaming quarantine inspection", () => {
  it("validates without buffering the complete PDF and returns a disposable artifact", async () => {
    const bytes = Buffer.from("%PDF-1.7\n1 0 obj << /Type /Catalog >> endobj\n%%EOF");
    const artifact = await inspectQuarantinedPdf({
      source: Readable.from([bytes.subarray(0, 9), bytes.subarray(9)]),
      expectedBytes: bytes.length,
      expectedSha256: sha256(bytes),
      maximumBytes: 1024,
      temporaryRoot: await temporaryRoot(),
      runTool: safeToolRunner(),
    });
    expect(artifact).toMatchObject({ byteLength: bytes.length, sha256: sha256(bytes) });
    expect(artifact.inspection.dangerousActionsDetected).toBe(false);
    await artifact.dispose();
  });

  it("rejects active PDF actions but not similarly named ordinary tokens", async () => {
    const ordinary = Buffer.from("%PDF-1.7\n/AAPL /JScript\n%%EOF");
    const ordinaryArtifact = await inspectQuarantinedPdf({
      source: Readable.from(ordinary),
      expectedBytes: ordinary.length,
      expectedSha256: sha256(ordinary),
      maximumBytes: 1024,
      temporaryRoot: await temporaryRoot(),
      runTool: safeToolRunner(),
    });
    await ordinaryArtifact.dispose();

    const dangerous = Buffer.from("%PDF-1.7\n/OpenAction << /S /JavaScript >>\n%%EOF");
    await expect(inspectQuarantinedPdf({
      source: Readable.from(dangerous),
      expectedBytes: dangerous.length,
      expectedSha256: sha256(dangerous),
      maximumBytes: 1024,
      temporaryRoot: await temporaryRoot(),
      runTool: safeToolRunner(),
    })).rejects.toMatchObject({ category: "unsafe", code: "DANGEROUS_PDF_ACTION" });
  });

  it("rejects checksum and size mismatches before invoking external scanners", async () => {
    const bytes = Buffer.from("%PDF-1.7\n%%EOF");
    await expect(inspectQuarantinedPdf({
      source: Readable.from(bytes),
      expectedBytes: bytes.length,
      expectedSha256: "0".repeat(64),
      maximumBytes: 1024,
      temporaryRoot: await temporaryRoot(),
      runTool: async () => { throw new Error("must not run"); },
    })).rejects.toMatchObject({ category: "unsafe", code: "INTEGRITY_CHECK_FAILED" });
  });

  it("fails closed as an operational error when the malware scanner is unavailable", async () => {
    const bytes = Buffer.from("%PDF-1.7\n%%EOF");
    const runTool = async (command: string, args: string[]) => {
      if (command === "qpdf" && args[0] === "--show-encryption") {
        return { stdout: "File is not encrypted", stderr: "" };
      }
      if (command === "qpdf" && args[0] === "--qdf") await copyFile(args.at(-2)!, args.at(-1)!);
      if (command === "clamscan") {
        throw Object.assign(new Error("missing"), { code: "ENOENT" });
      }
      return { stdout: "", stderr: "" };
    };
    const result = inspectQuarantinedPdf({
      source: Readable.from(bytes),
      expectedBytes: bytes.length,
      expectedSha256: sha256(bytes),
      maximumBytes: 1024,
      temporaryRoot: await temporaryRoot(),
      runTool,
    });
    await expect(result).rejects.toEqual(expect.objectContaining<Partial<QuarantineInspectionError>>({
      category: "operational",
      code: "MALWARE_SCANNER_UNAVAILABLE",
    }));
  });
});
