export const STUDIO_PROJECT_QUERY_PARAM = "project";
export const STUDIO_PROJECT_LEGACY_QUERY_PARAM = "projectId";

function normalizeProjectId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function getStudioProjectIdFromSearchParams(
  searchParams:
    | { get: (key: string) => string | null }
    | Record<string, string | string[] | undefined>
    | null
    | undefined,
): string | null {
  if (!searchParams) return null;
  if ("get" in searchParams && typeof searchParams.get === "function") {
    return (
      normalizeProjectId(searchParams.get(STUDIO_PROJECT_QUERY_PARAM)) ??
      normalizeProjectId(searchParams.get(STUDIO_PROJECT_LEGACY_QUERY_PARAM))
    );
  }
  const record = searchParams as Record<string, string | string[] | undefined>;
  const candidate = record[STUDIO_PROJECT_QUERY_PARAM] ?? record[STUDIO_PROJECT_LEGACY_QUERY_PARAM];
  if (Array.isArray(candidate)) {
    for (const value of candidate) {
      const normalized = normalizeProjectId(value);
      if (normalized) return normalized;
    }
    return null;
  }
  return normalizeProjectId(candidate);
}

export function buildStudioProjectHref(projectId: string | null | undefined): string {
  const normalized = normalizeProjectId(projectId);
  if (!normalized) return "/studio";
  const params = new URLSearchParams();
  params.set(STUDIO_PROJECT_QUERY_PARAM, normalized);
  return "/studio?" + params.toString();
}