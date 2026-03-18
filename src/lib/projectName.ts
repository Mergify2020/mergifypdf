export const PROJECT_NAME_STORAGE_KEY = "mpdf:project-name";
const DEFAULT_PROJECT_NAME = "Untitled Project";

export function sanitizeProjectName(raw: string | null | undefined): string {
  const trimmed = (raw ?? "").trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_PROJECT_NAME;
}

export function deriveProjectNameFromFilename(filename: string | null | undefined): string {
  const trimmed = (filename ?? "").trim();
  if (!trimmed) return DEFAULT_PROJECT_NAME;
  const withoutPdfExtension = trimmed.replace(/\.pdf$/i, "").trim();
  return sanitizeProjectName(withoutPdfExtension);
}

export function projectNameToEditable(raw: string | null | undefined): string {
  const safe = sanitizeProjectName(raw);
  return safe.toLowerCase().endsWith(".pdf") ? safe.slice(0, -4) : safe;
}

export function projectNameToDisplay(raw: string | null | undefined): string {
  const safe = sanitizeProjectName(raw);
  return safe.toLowerCase().endsWith(".pdf") ? safe : `${safe}.pdf`;
}

export function projectNameToFile(raw: string | null | undefined): string {
  const base = sanitizeProjectName(raw)
    .replace(/[^\w\s.-]/g, "")
    .replace(/\s+/g, ".")
    .replace(/\.+/g, ".");
  const safe = base.length > 0 ? base : "MergifyPDF";
  return `${safe}.pdf`;
}
