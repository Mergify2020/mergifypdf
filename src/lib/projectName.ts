export const PROJECT_NAME_STORAGE_KEY = "mpdf:project-name";
const DEFAULT_PROJECT_NAME = "Untitled Project";

export function sanitizeProjectName(raw: string | null | undefined): string {
  const trimmed = (raw ?? "").trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_PROJECT_NAME;
}

export function projectNameToFile(raw: string | null | undefined): string {
  const base = sanitizeProjectName(raw)
    .replace(/[^\w\s.-]/g, "")
    .replace(/\s+/g, ".")
    .replace(/\.+/g, ".");
  const safe = base.length > 0 ? base : "MergifyPDF";
  return `${safe}.pdf`;
}
