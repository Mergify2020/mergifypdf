import { Redis } from "@upstash/redis";
import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { nextSignatureName } from "@/lib/signatureNames";

export type StoredSignature = {
  id: string;
  name: string;
  dataUrl: string;
  naturalWidth: number;
  naturalHeight: number;
  createdAt: number;
  typedText?: string;
  typedStyleId?: string;
};

const globalStore = globalThis as typeof globalThis & {
  __mpdfUserSignatures?: Map<string, StoredSignature[]>;
};

const memoryStore: Map<string, StoredSignature[]> =
  globalStore.__mpdfUserSignatures ?? new Map();

globalStore.__mpdfUserSignatures = memoryStore;

const rawRedisUrl = process.env.UPSTASH_REDIS_REST_URL;
const rawRedisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const redisUrl = rawRedisUrl?.trim();
const redisToken = rawRedisToken?.trim();

let redis: Redis | null = null;

if (redisUrl && redisToken) {
  try {
    redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });
  } catch {
    redis = null;
  }
}

const USER_SIG_KEY_PREFIX = "mpdf:user-signatures:";

type SignatureLibraryDelegate = {
  findUnique(args: {
    where: { userId: string };
    select: { signatures: true };
  }): Promise<{ signatures: unknown } | null>;
  upsert(args: {
    where: { userId: string };
    create: { userId: string; signatures: StoredSignature[] };
    update: { signatures: StoredSignature[] };
  }): Promise<unknown>;
};

function getSignatureLibraryDelegate() {
  // A running Next dev server can retain a Prisma client from before a schema
  // hot reload. Reading this dynamically lets the raw-SQL fallback below keep
  // the account library available until that server naturally reloads.
  return (prisma as unknown as { signatureLibrary?: SignatureLibraryDelegate })
    .signatureLibrary;
}

function getMemory(userId: string): StoredSignature[] {
  return memoryStore.get(userId) ?? [];
}

function setMemory(userId: string, signatures: StoredSignature[]) {
  memoryStore.set(userId, signatures);
}

function isStoredSignature(value: unknown): value is StoredSignature {
  if (!value || typeof value !== "object") return false;
  const signature = value as Partial<StoredSignature>;
  return (
    typeof signature.id === "string" &&
    typeof signature.name === "string" &&
    typeof signature.dataUrl === "string" &&
    typeof signature.naturalWidth === "number" &&
    typeof signature.naturalHeight === "number" &&
    typeof signature.createdAt === "number"
  );
}

function asStoredSignatures(value: unknown): StoredSignature[] {
  return Array.isArray(value) ? value.filter(isStoredSignature) : [];
}

async function loadDatabaseLibrary(userId: string): Promise<StoredSignature[] | null> {
  const library = getSignatureLibraryDelegate();
  if (library) {
    const row = await library.findUnique({
      where: { userId },
      select: { signatures: true },
    });
    return row ? asStoredSignatures(row.signatures) : null;
  }

  const rows = await prisma.$queryRaw<Array<{ signatures: unknown }>>(
    Prisma.sql`SELECT "signatures" FROM "SignatureLibrary" WHERE "userId" = ${userId} LIMIT 1`,
  );
  return rows[0] ? asStoredSignatures(rows[0].signatures) : null;
}

async function saveDatabaseLibrary(userId: string, signatures: StoredSignature[]) {
  const library = getSignatureLibraryDelegate();
  if (library) {
    await library.upsert({
      where: { userId },
      create: { userId, signatures },
      update: { signatures },
    });
    return;
  }

  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO "SignatureLibrary" ("id", "userId", "signatures", "createdAt", "updatedAt")
      VALUES (${randomUUID()}, ${userId}, ${JSON.stringify(signatures)}::jsonb, NOW(), NOW())
      ON CONFLICT ("userId")
      DO UPDATE SET "signatures" = EXCLUDED."signatures", "updatedAt" = NOW()
    `,
  );
}

export async function loadUserSignatures(
  userId: string,
): Promise<StoredSignature[]> {
  // The database is the source of truth. Redis is only a best-effort cache,
  // so a server restart or a different server instance never loses a library.
  const databaseSignatures = await loadDatabaseLibrary(userId);
  if (databaseSignatures) {
    const signatures = databaseSignatures;
    setMemory(userId, signatures);
    return signatures;
  }

  const key = `${USER_SIG_KEY_PREFIX}${userId}`;
  try {
    if (redis) {
      const value = await redis.get<StoredSignature[]>(key);
      if (Array.isArray(value)) {
        // Preserve libraries created by the previous Redis-only implementation.
        await prisma.$executeRaw(Prisma.sql`
          INSERT INTO "SignatureLibrary" ("id", "userId", "signatures", "createdAt", "updatedAt")
          VALUES (${randomUUID()}, ${userId}, ${JSON.stringify(value)}::jsonb, NOW(), NOW())
          ON CONFLICT ("userId") DO NOTHING
        `);
        const migrated = await loadDatabaseLibrary(userId);
        if (!migrated) throw new Error("Signature library migration failed");
        setMemory(userId, migrated);
        return migrated;
      }
    }
  } catch {
    // fall back
  }
  return getMemory(userId);
}

export async function saveUserSignatures(
  userId: string,
  signatures: StoredSignature[],
): Promise<void> {
  const key = `${USER_SIG_KEY_PREFIX}${userId}`;
  await saveDatabaseLibrary(userId, signatures);
  setMemory(userId, signatures);
  try {
    if (redis) {
      await redis.set(key, signatures);
    }
  } catch {
    // ignore redis errors; memory already updated
  }
}

/** Change one entry under a database row lock so concurrent tabs cannot replace each other's libraries. */
export async function mutateUserSignatures(
  userId: string,
  mutation: { type: "add"; signature: StoredSignature; autoName?: boolean } | { type: "rename"; id: string; name: string } | { type: "delete"; id: string },
): Promise<StoredSignature[]> {
  // Import a legacy Redis library before creating the database row, if needed.
  await loadUserSignatures(userId);
  const signatures = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO "SignatureLibrary" ("id", "userId", "signatures", "createdAt", "updatedAt")
      VALUES (${randomUUID()}, ${userId}, '[]'::jsonb, NOW(), NOW())
      ON CONFLICT ("userId") DO NOTHING
    `);
    const rows = await tx.$queryRaw<Array<{ signatures: unknown }>>(Prisma.sql`
      SELECT "signatures" FROM "SignatureLibrary" WHERE "userId" = ${userId} FOR UPDATE
    `);
    const current = asStoredSignatures(rows[0]?.signatures);
    const next = mutation.type === "add"
      ? [{ ...mutation.signature, name: mutation.autoName ? nextSignatureName(current) : mutation.signature.name }, ...current.filter((item) => item.id !== mutation.signature.id)]
      : mutation.type === "rename"
        ? current.map((item) => item.id === mutation.id ? { ...item, name: mutation.name } : item)
        : current.filter((item) => item.id !== mutation.id);
    await tx.$executeRaw(Prisma.sql`
      UPDATE "SignatureLibrary" SET "signatures" = ${JSON.stringify(next)}::jsonb, "updatedAt" = NOW()
      WHERE "userId" = ${userId}
    `);
    return next;
  });
  setMemory(userId, signatures);
  return signatures;
}

