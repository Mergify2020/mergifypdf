export const PT_TO_PX = 96 / 72;
export const TEXT_SIZE_MIN_PT = 1;
export const TEXT_SIZE_MAX_PT = 96;

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function hexToRgb(hex: string) {
  const value = hex.replace("#", "");
  if (value.length !== 6) return null;
  const r = Number.parseInt(value.slice(0, 2), 16) / 255;
  const g = Number.parseInt(value.slice(2, 4), 16) / 255;
  const b = Number.parseInt(value.slice(4, 6), 16) / 255;
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
  return { r, g, b };
}

export function rgbToHex(r: number, g: number, b: number) {
  const clampChannel = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
  return `#${clampChannel(r).toString(16).padStart(2, "0")}${clampChannel(g)
    .toString(16)
    .padStart(2, "0")}${clampChannel(b).toString(16).padStart(2, "0")}`;
}

export function rgbToHsv(r: number, g: number, b: number) {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;
  let hue = 0;
  if (delta !== 0) {
    if (max === rNorm) hue = ((gNorm - bNorm) / delta) % 6;
    else if (max === gNorm) hue = (bNorm - rNorm) / delta + 2;
    else hue = (rNorm - gNorm) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  return { h: hue, s: max === 0 ? 0 : (delta / max) * 100, v: max * 100 };
}

export function hsvToHex(h: number, s: number, v: number) {
  const hue = ((h % 360) + 360) % 360;
  const sat = clamp(s / 100, 0, 1);
  const val = clamp(v / 100, 0, 1);
  const c = val * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = val - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hue < 60) [r, g] = [c, x];
  else if (hue < 120) [r, g] = [x, c];
  else if (hue < 180) [g, b] = [c, x];
  else if (hue < 240) [g, b] = [x, c];
  else if (hue < 300) [r, b] = [x, c];
  else [r, b] = [c, x];
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

export function hslToHex(h: number, s: number, l: number) {
  const hue = ((h % 360) + 360) % 360;
  const sat = clamp(s / 100, 0, 1);
  const light = clamp(l / 100, 0, 1);
  if (sat === 0) {
    const gray = Math.round(light * 255);
    return rgbToHex(gray, gray, gray);
  }
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = light - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hue < 60) [r, g] = [c, x];
  else if (hue < 120) [r, g] = [x, c];
  else if (hue < 180) [g, b] = [c, x];
  else if (hue < 240) [g, b] = [x, c];
  else if (hue < 300) [r, b] = [x, c];
  else [r, b] = [c, x];
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

export function normalizeCssColor(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "transparent") return null;
  if (trimmed.startsWith("#")) {
    if (trimmed.length === 4) {
      const [, r, g, b] = trimmed;
      return `#${r}${r}${g}${g}${b}${b}`;
    }
    return trimmed.slice(0, 7);
  }
  const match = trimmed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i);
  if (!match) return null;
  const alpha = match[4] ? Number(match[4]) : 1;
  if (Number.isNaN(alpha) || alpha <= 0) return null;
  return rgbToHex(Number(match[1]), Number(match[2]), Number(match[3]));
}

export function normalizeRotation(rotation = 0) {
  return ((rotation % 360) + 360) % 360;
}

export function formatSignedRotation(rotation = 0) {
  const rounded = Math.round(normalizeRotation(rotation));
  if (rounded === 360) return 0;
  return rounded > 180 ? rounded - 360 : rounded;
}

export function getSnapTextRotationTarget(rotation: number, threshold = 3) {
  const normalized = normalizeRotation(rotation);
  const snapTargets = [0, 45, 90, 180, 270, 360];
  let bestTarget: number | null = null;
  let bestDelta = Number.POSITIVE_INFINITY;
  for (const target of snapTargets) {
    const delta = Math.abs(normalized - target);
    const wrapDelta = Math.min(delta, 360 - delta);
    if (wrapDelta < bestDelta) {
      bestDelta = wrapDelta;
      bestTarget = target === 360 ? 0 : target;
    }
  }
  return bestTarget != null && bestDelta <= threshold ? bestTarget : null;
}

export function snapTextRotation(rotation: number, threshold = 3) {
  return getSnapTextRotationTarget(rotation, threshold) ?? normalizeRotation(rotation);
}

export function normalizeTextSize(value: number) {
  return clamp(Math.round(value * 2) / 2, TEXT_SIZE_MIN_PT, TEXT_SIZE_MAX_PT);
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function textToHtml(value: string) {
  return escapeHtml(value).replace(/\r?\n/g, "<br>");
}

export function parseFontSize(styleValue: string, fallback: number) {
  const matchPt = styleValue.match(/(\d+(\.\d+)?)pt/);
  if (matchPt) {
    const parsed = Number(matchPt[1]);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  const matchPx = styleValue.match(/(\d+(\.\d+)?)px/);
  if (matchPx) {
    const parsed = Number(matchPx[1]);
    return Number.isNaN(parsed) ? fallback : parsed / PT_TO_PX;
  }
  return fallback;
}
