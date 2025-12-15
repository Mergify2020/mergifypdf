export function normalizeForSearch(input: string) {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return "";
  try {
    return trimmed
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ");
  } catch {
    return trimmed.replace(/\s+/g, " ");
  }
}

export function matchesSearch(text: string, query: string) {
  const q = normalizeForSearch(query);
  if (!q) return true;
  return normalizeForSearch(text).includes(q);
}

