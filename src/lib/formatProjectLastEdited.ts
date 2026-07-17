export function formatProjectLastEdited(value: string | number | Date, referenceNow: string | number | Date = new Date()): string {
  return `Edited ${formatProjectRelativeTime(value, referenceNow)}`;
}

export function formatProjectRelativeTime(value: string | number | Date, referenceNow: string | number | Date = new Date()): string {
  const target = value instanceof Date ? value : new Date(value);
  const targetMs = target.getTime();
  if (Number.isNaN(targetMs)) return "recently";

  const now = referenceNow instanceof Date ? referenceNow : new Date(referenceNow);
  const diffMs = Math.max(0, now.getTime() - targetMs);
  const minuteMs = 60_000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;

  if (diffMs < hourMs) {
    const minutes = Math.max(1, Math.floor(diffMs / minuteMs));
    return `${minutes} min ago`;
  }

  if (diffMs < dayMs) {
    const hours = Math.max(1, Math.floor(diffMs / hourMs));
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }

  const days = Math.floor(diffMs / dayMs);
  if (days < 30) {
    const displayDays = Math.max(1, days);
    return `${displayDays} ${displayDays === 1 ? "day" : "days"} ago`;
  }

  const inSameYear = target.getUTCFullYear() === now.getUTCFullYear();
  const formatter = new Intl.DateTimeFormat(
    "en-US",
    inSameYear
      ? { month: "short", day: "numeric", timeZone: "UTC" }
      : { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }
  );

  return formatter.format(target);
}

export function formatProjectActivityDate(value: string | number | Date, referenceNow: string | number | Date = new Date()): string {
  const target = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(target.getTime())) return "Oct 2, 2025";

  const now = referenceNow instanceof Date ? referenceNow : new Date(referenceNow);
  const isToday =
    target.getUTCFullYear() === now.getUTCFullYear() &&
    target.getUTCMonth() === now.getUTCMonth() &&
    target.getUTCDate() === now.getUTCDate();

  if (isToday) return "Today";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(target);
}
