"use client";

let studioWarmup: Promise<unknown> | null = null;

/** Preload the Studio client bundle before navigation without changing UI state. */
export function warmStudioClient() {
  if (typeof window === "undefined") return;
  studioWarmup ??= import("@/app/(app)/studio/StudioClient").catch(() => null);
}
