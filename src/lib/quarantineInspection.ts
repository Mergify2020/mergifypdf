import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Transform, type Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import {
  assertQuarantinedPdfSafe,
  type QuarantinedPdfInspection,
} from "@/lib/securePdfInspection";

const execFileAsync = promisify(execFile);
const TOOL_TIMEOUT_MS = 2 * 60 * 1000;
const TOOL_OUTPUT_LIMIT = 1024 * 1024;
const PDF_HEADER_BYTES = 8;
const DANGEROUS_PDF_ACTION_PATTERN = new RegExp(
  "/(?:JavaScript|JS|Launch|SubmitForm|ImportData|RichMedia|EmbeddedFile|OpenAction|AA)(?![A-Za-z0-9_])",
);

export class QuarantineInspectionError extends Error {
  constructor(
    readonly code: string,
    readonly category: "unsafe" | "operational",
    message: string,
  ) {
    super(message);
    this.name = "QuarantineInspectionError";
  }
}

type RunTool = (command: string, args: string[]) => Promise<{ stdout: string; stderr: string }>;

async function defaultRunTool(command: string, args: string[]) {
  return execFileAsync(command, args, {
    timeout: TOOL_TIMEOUT_MS,
    maxBuffer: TOOL_OUTPUT_LIMIT,
    encoding: "utf8",
    windowsHide: true,
  });
}

function toolErrorCode(error: unknown) {
  return (error as { code?: string | number }).code;
}

async function requireQpdf(filePath: string, qdfPath: string, runTool: RunTool) {
  let encryption;
  try {
    encryption = await runTool("qpdf", ["--show-encryption", "--", filePath]);
  } catch (error) {
    if (toolErrorCode(error) === "ENOENT") {
      throw new QuarantineInspectionError("QPDF_UNAVAILABLE", "operational", "PDF inspection is unavailable.");
    }
    throw new QuarantineInspectionError("INVALID_PDF", "unsafe", "The uploaded file is not a valid PDF.");
  }
  if (!encryption.stdout.toLowerCase().includes("file is not encrypted")) {
    throw new QuarantineInspectionError(
      "ENCRYPTED_PDF_UNSCANNABLE",
      "unsafe",
      "Encrypted PDFs cannot pass security inspection.",
    );
  }
  try {
    await runTool("qpdf", ["--check", "--", filePath]);
    await runTool("qpdf", ["--qdf", "--object-streams=disable", "--", filePath, qdfPath]);
  } catch (error) {
    if (toolErrorCode(error) === "ENOENT") {
      throw new QuarantineInspectionError("QPDF_UNAVAILABLE", "operational", "PDF inspection is unavailable.");
    }
    throw new QuarantineInspectionError("INVALID_PDF", "unsafe", "The uploaded file is not a valid PDF.");
  }
}

async function requireMalwareScan(filePath: string, runTool: RunTool) {
  try {
    await runTool("clamscan", ["--no-summary", "--infected", "--", filePath]);
  } catch (error) {
    const code = toolErrorCode(error);
    if (code === 1) {
      throw new QuarantineInspectionError("MALWARE_DETECTED", "unsafe", "The uploaded file was rejected.");
    }
    throw new QuarantineInspectionError(
      code === "ENOENT" ? "MALWARE_SCANNER_UNAVAILABLE" : "MALWARE_SCANNER_FAILED",
      "operational",
      "Malware inspection is unavailable.",
    );
  }
}

export async function containsDangerousPdfActions(filePath: string) {
  const stream = createReadStream(filePath);
  let carry = "";
  for await (const chunk of stream) {
    const text = carry + Buffer.from(chunk).toString("latin1");
    if (DANGEROUS_PDF_ACTION_PATTERN.test(text)) return true;
    carry = text.slice(-128);
  }
  return false;
}

export type InspectedPdfArtifact = {
  filePath: string;
  byteLength: number;
  sha256: string;
  inspection: QuarantinedPdfInspection;
  dispose(): Promise<void>;
};

export async function inspectQuarantinedPdf(input: {
  source: Readable;
  expectedBytes: number;
  expectedSha256: string;
  maximumBytes: number;
  temporaryRoot?: string;
  runTool?: RunTool;
}): Promise<InspectedPdfArtifact> {
  if (input.expectedBytes <= 0 || input.expectedBytes > input.maximumBytes) {
    throw new QuarantineInspectionError("SIZE_LIMIT_EXCEEDED", "unsafe", "The PDF exceeds the inspection limit.");
  }
  const directory = await mkdtemp(join(input.temporaryRoot ?? tmpdir(), "mergifypdf-inspect-"));
  const filePath = join(directory, "quarantined.pdf");
  const qdfPath = join(directory, "expanded.qdf.pdf");
  const hash = createHash("sha256");
  let byteLength = 0;
  let header = Buffer.alloc(0);
  const verifier = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      byteLength += chunk.length;
      if (byteLength > input.maximumBytes || byteLength > input.expectedBytes) {
        callback(new QuarantineInspectionError("SIZE_MISMATCH", "unsafe", "The uploaded file failed size validation."));
        return;
      }
      if (header.length < PDF_HEADER_BYTES) {
        header = Buffer.concat([header, chunk.subarray(0, PDF_HEADER_BYTES - header.length)]);
      }
      hash.update(chunk);
      callback(null, chunk);
    },
  });

  try {
    await pipeline(input.source, verifier, createWriteStream(filePath, { flags: "wx", mode: 0o600 }));
    const sha256 = hash.digest("hex");
    const pdfHeaderValid = header.subarray(0, 5).toString("ascii") === "%PDF-";
    if (byteLength !== input.expectedBytes || sha256 !== input.expectedSha256.toLowerCase() || !pdfHeaderValid) {
      throw new QuarantineInspectionError("INTEGRITY_CHECK_FAILED", "unsafe", "The uploaded file failed integrity validation.");
    }

    const runTool = input.runTool ?? defaultRunTool;
    await requireQpdf(filePath, qdfPath, runTool);
    await requireMalwareScan(filePath, runTool);
    const dangerousActionsDetected = await containsDangerousPdfActions(qdfPath);
    const inspection: QuarantinedPdfInspection = {
      actualSha256: sha256,
      byteLength,
      pdfHeaderValid,
      qpdfValid: true,
      malwareDetected: false,
      dangerousActionsDetected,
    };
    try {
      assertQuarantinedPdfSafe(inspection, {
        sha256: input.expectedSha256,
        byteLength: input.expectedBytes,
      });
    } catch (error) {
      const code = (error as { code?: string }).code ?? "UNSAFE_PDF";
      throw new QuarantineInspectionError(code, "unsafe", "The uploaded PDF was rejected.");
    }
    return {
      filePath,
      byteLength,
      sha256,
      inspection,
      dispose: () => rm(directory, { recursive: true, force: true }),
    };
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    if (error instanceof QuarantineInspectionError) throw error;
    throw new QuarantineInspectionError("INSPECTION_IO_FAILED", "operational", "PDF inspection failed.");
  }
}

