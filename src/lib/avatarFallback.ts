const palette = [
  "#1E293B",
  "#334155",
  "#475569",
  "#3F3F46",
  "#1F2937",
  "#0F172A",
  "#1A1A1A",
  "#2D2D2D",
  "#2E3A59",
  "#3B4252",
];

function hashSeed(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

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
  const reference = (seed ?? displayName ?? "user").toLowerCase();
  const color = palette[hashSeed(reference) % palette.length];
  const initials = extractInitials(displayName ?? seed ?? "User");
  return { color, initials };
}
