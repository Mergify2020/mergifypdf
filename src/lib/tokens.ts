import crypto from "crypto";
import { prisma } from "@/lib/prisma";

/**
 * Create a reset token for a user (string userId).
 * Persists to ResetToken table and returns the raw token string.
 */
export async function generateToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

  await prisma.resetToken.create({
    data: {
      token,
      userId,     // <- string
      expiresAt,
    },
  });

  return token;
}

/**
 * Optional: verify and consume a token (if you need it later).
 */
export async function verifyAndConsumeToken(token: string) {
  const row = await prisma.resetToken.findUnique({ where: { token } });
  if (!row) return { ok: false, error: "Invalid token" };
  if (row.expiresAt < new Date()) {
    // clean up expired
    await prisma.resetToken.delete({ where: { token } });
    return { ok: false, error: "Expired token" };
  }
  // consume (delete) the token
  await prisma.resetToken.delete({ where: { token } });
  return { ok: true, userId: row.userId };
}
