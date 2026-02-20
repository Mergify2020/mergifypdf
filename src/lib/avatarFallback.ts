const CARBON_AVATAR_COLOR = "#334155";

function extractInitials(source: string) {
  if (!source) return "U";
  const cleaned = source.trim();
  if (!cleaned) return "U";
  const parts = cleaned
    .replace(/[_\-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return "U";
}

export function getAvatarFallback(seed?: string | null, displayName?: string | null) {
  const initials = extractInitials(displayName ?? seed ?? "User");
  return { color: CARBON_AVATAR_COLOR, initials };
}
