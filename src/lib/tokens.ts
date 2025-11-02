// src/lib/tokens.ts — REPLACE EVERYTHING
import { randomBytes } from "crypto";

/**
 * Returns a cryptographically-strong 64-char hex token (random, not tied to userId).
 * Keeps the same signature so imports still work.
 */
export async function generateToken(_userId?: string): Promise<string> {
  return randomBytes(32).toString("hex"); // 64 hex chars
}
