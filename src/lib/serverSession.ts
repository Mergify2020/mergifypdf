import type { Session } from "next-auth";
import { getServerSession } from "next-auth";
import { cache } from "react";

const DEFAULT_SESSION_TIMEOUT_MS = process.env.NODE_ENV === "production" ? 1500 : 250;

const getServerSessionForRequest = cache(async (): Promise<Session | null> => {
  const { authOptions } = await import("@/lib/authOptions");
  return getServerSession(authOptions);
});

export async function getServerSessionSafe(
  timeoutMs: number = DEFAULT_SESSION_TIMEOUT_MS,
): Promise<Session | null> {
  if (process.env.NEXT_PHASE === "phase-production-build") return null;
  try {
    const sessionPromise = getServerSessionForRequest();
    if (!timeoutMs || timeoutMs <= 0) {
      return await sessionPromise;
    }
    return await Promise.race([
      sessionPromise,
      new Promise<Session | null>((resolve) => {
        setTimeout(() => resolve(null), timeoutMs);
      }),
    ]);
  } catch {
    return null;
  }
}
