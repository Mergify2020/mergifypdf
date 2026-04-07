// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaDbUnavailableUntil: number | undefined;
};

const DB_UNAVAILABLE_COOLDOWN_MS = 1_500;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // log: ["query", "error", "warn"], // optional
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export function isPrismaDatabaseUnavailableError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const maybeError = error as { code?: unknown; message?: unknown };
  if (maybeError.code === "P1001" || maybeError.code === "P1017") {
    return true;
  }

  if (typeof maybeError.message !== "string") {
    return false;
  }

  return (
    maybeError.message.includes("Can't reach database server") ||
    maybeError.message.includes("db.prisma.io:5432")
  );
}

export function isPrismaDatabaseCooldownActive() {
  return (globalForPrisma.prismaDbUnavailableUntil ?? 0) > Date.now();
}

export function markPrismaDatabaseUnavailable(error?: unknown) {
  if (error !== undefined && !isPrismaDatabaseUnavailableError(error)) {
    return;
  }

  globalForPrisma.prismaDbUnavailableUntil = Date.now() + DB_UNAVAILABLE_COOLDOWN_MS;
}

export function clearPrismaDatabaseUnavailable() {
  globalForPrisma.prismaDbUnavailableUntil = 0;
}

// Export both so imports work either way.
export default prisma;
