type SafeTimingValue = number | boolean | null;

export function devTimingsEnabled(env: Record<string, string | undefined> = process.env) {
  return env.NEXT_PUBLIC_DEV_TIMINGS === "1" ||
    (typeof window === "undefined" && env.DEV_TIMINGS === "1");
}

export function safeTimingDetail(detail: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(detail).filter((entry): entry is [string, SafeTimingValue] => {
      const [, value] = entry;
      return value === null || typeof value === "number" || typeof value === "boolean";
    }),
  );
}

export function logDevTiming(scope: string, event: string, detail: Record<string, unknown> = {}) {
  if (!devTimingsEnabled()) return;
  console.info(`[timing:${scope}:${event}]`, safeTimingDetail(detail));
}
