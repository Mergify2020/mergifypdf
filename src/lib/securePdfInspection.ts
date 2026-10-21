import { SecureUploadError, normalizeSha256Hex } from "@/lib/secureUploadPolicy";

export type QuarantinedPdfInspection = {
  actualSha256: string;
  byteLength: number;
  pdfHeaderValid: boolean;
  qpdfValid: boolean;
  malwareDetected: boolean;
  dangerousActionsDetected: boolean;
};

export function assertQuarantinedPdfSafe(
  inspection: QuarantinedPdfInspection,
  expected: { sha256: string; byteLength: number },
) {
  if (normalizeSha256Hex(inspection.actualSha256) !== normalizeSha256Hex(expected.sha256)) {
    throw new SecureUploadError("CHECKSUM_MISMATCH", 422, "The uploaded file failed integrity validation.");
  }
  if (inspection.byteLength !== expected.byteLength) {
    throw new SecureUploadError("SIZE_MISMATCH", 422, "The uploaded file failed size validation.");
  }
  if (!inspection.pdfHeaderValid || !inspection.qpdfValid) {
    throw new SecureUploadError("INVALID_PDF", 422, "The uploaded file is not a valid PDF.");
  }
  if (inspection.malwareDetected) {
    throw new SecureUploadError("MALWARE_DETECTED", 422, "The uploaded file was rejected.");
  }
  if (inspection.dangerousActionsDetected) {
    throw new SecureUploadError("DANGEROUS_PDF_ACTION", 422, "The PDF contains unsupported active content.");
  }
  return true;
}
