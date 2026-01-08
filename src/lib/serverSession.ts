import type { Session } from "next-auth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

const DEFAULT_SESSION_TIMEOUT_MS = 1500;

export async function getServerSessionSafe(
  timeoutMs: number = DEFAULT_SESSION_TIMEOUT_MS,
): Promise<Session | null> {
  if (process.env.NEXT_PHASE === "phase-production-build") return null;
  try {
    const sessionPromise = getServerSession(authOptions);
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
