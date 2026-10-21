import type { Session } from "next-auth";
import { getServerSession } from "next-auth";
import { cache } from "react";

export type ServerSessionState =
  | { status: "authenticated"; session: Session }
  | { status: "unauthenticated"; session: null }
  | { status: "unavailable"; session: null };

const getServerSessionForRequest = cache(async (): Promise<Session | null> => {
  const { authOptions } = await import("@/lib/authOptions");
  return getServerSession(authOptions);
});

export async function getServerSessionState(): Promise<ServerSessionState> {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return { status: "unauthenticated", session: null };
  }

  try {
    const session = await getServerSessionForRequest();
    return session
      ? { status: "authenticated", session }
      : { status: "unauthenticated", session: null };
  } catch {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[session] Session provider temporarily unavailable.");
    }
    return { status: "unavailable", session: null };
  }
}

export async function getServerSessionSafe(): Promise<Session | null> {
  const state = await getServerSessionState();
  return state.session;
}
