// src/lib/resetTokenWriter.ts
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

/**
 * Creates a fresh reset-token for a user:
 * 1) delete old tokens for this user
 * 2) try insert; if token collision (P2002) regenerate and retry
 * 3) returns the created row or an error string
 */
export async function createFreshResetTokenForUser(userId: string, expiresAt: Date) {
  try {
    // Ensure only one active token per user (works even if no unique on userId)
    await prisma.resetToken.deleteMany({ where: { userId } });

    // up to 5 attempts in the astronomically unlikely event of collisions
    for (let i = 0; i < 5; i++) {
      const token = crypto.randomBytes(32).toString("hex"); // 64-char hex

      try {
        const row = await prisma.resetToken.create({
          data: { token, userId, expiresAt },
          select: { id: true, token: true, userId: true, createdAt: true, expiresAt: true },
        });
        return { ok: true as const, row };
      } catch (e: any) {
        if (e?.code === "P2002") {
          // token collision – try again with a new token
          continue;
        }
        return { ok: false as const, error: String(e) };
      }
    }

    return { ok: false as const, error: "token-collision-after-retries" };
  } catch (e) {
    return { ok: false as const, error: String(e) };
  }
}
