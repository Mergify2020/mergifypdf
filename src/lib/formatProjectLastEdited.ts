export function formatProjectLastEdited(value: string | number | Date): string {
  const target = value instanceof Date ? value : new Date(value);
  const targetMs = target.getTime();
  if (Number.isNaN(targetMs)) return "Edited recently";

  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - targetMs);
  const minuteMs = 60_000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;

  if (diffMs < hourMs) {
    const minutes = Math.max(1, Math.floor(diffMs / minuteMs));
    return `Edited ${minutes} min ago`;
  }

  if (diffMs < dayMs) {
    const hours = Math.max(1, Math.floor(diffMs / hourMs));
    return `Edited ${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }

  const days = Math.floor(diffMs / dayMs);
  if (days < 30) {
    const displayDays = Math.max(1, days);
    return `Edited ${displayDays} ${displayDays === 1 ? "day" : "days"} ago`;
  }

  const inSameYear = target.getFullYear() === now.getFullYear();
  const formatter = new Intl.DateTimeFormat("en-US", inSameYear
    ? { month: "short", day: "numeric" }
    : { month: "short", day: "numeric", year: "numeric" });

  return `Edited ${formatter.format(target)}`;
}

