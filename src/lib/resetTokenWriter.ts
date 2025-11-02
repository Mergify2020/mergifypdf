// src/lib/resetTokenWriter.ts
import { prisma } from "@/lib/prisma";

/**
 * Inserts a reset-token row. Retries on rare token collisions.
 * Assumes your Prisma model:
 *
 * model ResetToken {
 *   id        String   @id @default(cuid())
 *   token     String   @unique
 *   userId    String
 *   expiresAt DateTime
 *   createdAt DateTime @default(now())
 * }
 */
export async function createResetTokenRow(params: {
  token: string;
  userId: string;
  expiresAt: Date;
}) {
  const { token, userId, expiresAt } = params;

  let lastErr: unknown = null;

  for (let i = 0; i < 3; i++) {
    try {
      const row = await prisma.resetToken.create({
        data: { token, userId, expiresAt },
        select: { id: true, token: true, userId: true, createdAt: true },
      });
      return { ok: true as const, row };
    } catch (e: any) {
      // P2002 = unique constraint violation (token collision)
      if (e?.code === "P2002") {
        lastErr = e;
        continue; // try again (caller should provide a new token if needed)
      }
      return { ok: false as const, error: String(e) };
    }
  }

  return { ok: false as const, error: String(lastErr ?? "unknown error") };
}
