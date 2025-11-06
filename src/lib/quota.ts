// src/lib/quota.ts
import { cookies } from "next/headers";

export const COOKIE = "mpdf_free_used"; // stores YYYY-MM-DD
export const today = () => new Date().toISOString().slice(0, 10);

export async function hasUsedToday(): Promise<boolean> {
  const c = await cookies();
  return c.get(COOKIE)?.value === today();
}

export async function markUsedToday(): Promise<void> {
  const c = await cookies();
  c.set({
    name: COOKIE,
    value: today(),
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 3,
  });
}

export async function clearQuotaCookie(): Promise<void> {
  const c = await cookies();
  c.delete(COOKIE);
}
