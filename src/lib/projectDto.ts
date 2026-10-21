type ProjectWithLegacyStorageKeys = Record<string, unknown> & {
  pdfKey?: unknown;
  previewKey?: unknown;
};

export function toSafeProjectDto<T extends ProjectWithLegacyStorageKeys>(
  project: T,
  overrides: Record<string, unknown> = {},
) {
  const { pdfKey, previewKey, ...safeProject } = project;
  return {
    ...safeProject,
    hasPdf: typeof pdfKey === "string" && pdfKey.length > 0,
    hasPreview: typeof previewKey === "string" && previewKey.length > 0,
    ...overrides,
  };
}
