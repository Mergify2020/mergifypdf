import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  authorizeProjectAsset,
  type ProjectAssetOperation,
} from "@/lib/storageAuthorization";
import { SecureUploadError } from "@/lib/secureUploadPolicy";
import { resolveRuntimeEnvironment } from "@/lib/runtimeEnvironment";

const IDLE_TTL_MS = 10 * 60 * 1000;
const ABSOLUTE_TTL_MS = 8 * 60 * 60 * 1000;
const ACTIVITY_UPDATE_INTERVAL_MS = 60 * 1000;
const MAX_ACTIVE_READ_SESSIONS = 8;

export const STORAGE_READ_OPERATIONS = ["VIEW", "DOWNLOAD", "PRINT", "SIGN"] as const;
export type StorageReadOperation = (typeof STORAGE_READ_OPERATIONS)[number];

export class StorageReadSessionNotFoundError extends Error {
  readonly status = 404;
  readonly code = "STORAGE_READ_SESSION_NOT_FOUND";
  constructor() {
    super("File access session not found.");
    this.name = "StorageReadSessionNotFoundError";
  }
}

function tokenHash(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function tokenMatches(token: string, expectedHash: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token) || !/^[a-f0-9]{64}$/.test(expectedHash)) return false;
  const actual = Buffer.from(tokenHash(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function normalizeOperation(value: unknown): StorageReadOperation {
  const operation = typeof value === "string" ? value.trim().toUpperCase() : "VIEW";
  if (!STORAGE_READ_OPERATIONS.includes(operation as StorageReadOperation)) {
    throw new SecureUploadError("INVALID_READ_OPERATION", 400, "Invalid file access operation.");
  }
  return operation as StorageReadOperation;
}

function authorizationOperation(operation: StorageReadOperation): ProjectAssetOperation {
  return operation === "DOWNLOAD" ? "download" : "view";
}

async function resolveAsset(input: {
  userId: string;
  projectId: string;
  assetId?: string;
  operation: StorageReadOperation;
}) {
  let assetId = input.assetId;
  if (!assetId) {
    const latest = await prisma.projectAsset.findFirst({
      where: {
        projectId: input.projectId,
        role: "SOURCE",
        deletedAt: null,
        project: { userId: input.userId, trashedAt: null },
        storageObject: { ownerId: input.userId, status: "READY", deletedAt: null },
      },
      orderBy: { revision: "desc" },
      select: { id: true },
    });
    assetId = latest?.id;
  }
  if (!assetId) throw new StorageReadSessionNotFoundError();
  return authorizeProjectAsset({
    userId: input.userId,
    projectId: input.projectId,
    assetId,
    operation: authorizationOperation(input.operation),
  });
}

export function validateReadSessionRequest(body: unknown) {
  if (!body || typeof body !== "object") {
    throw new SecureUploadError("INVALID_REQUEST", 400, "Invalid file access request.");
  }
  const record = body as Record<string, unknown>;
  const operation = normalizeOperation(record.operation);
  const assetId = typeof record.assetId === "string" && /^[A-Za-z0-9_-]{8,128}$/.test(record.assetId)
    ? record.assetId
    : undefined;
  if (record.assetId !== undefined && !assetId) {
    throw new SecureUploadError("INVALID_ASSET", 400, "Invalid project asset.");
  }
  return { operation, assetId };
}

export async function createStorageReadSession(input: {
  userId: string;
  projectId: string;
  body: unknown;
  now?: Date;
}) {
  if (process.env.STORAGE_MODEL_V2_ENABLED !== "true") {
    throw new SecureUploadError("SECURE_STORAGE_DISABLED", 404, "Secure file access is not enabled.");
  }
  const now = input.now ?? new Date();
  const { operation, assetId } = validateReadSessionRequest(input.body);
  const asset = await resolveAsset({ ...input, assetId, operation });
  if (
    asset.bucketClass !== "source" ||
    asset.environment !== resolveRuntimeEnvironment() ||
    asset.kind !== "pdf-source" ||
    asset.contentType !== "application/pdf" ||
    asset.byteLength === null ||
    !asset.sha256
  ) {
    throw new StorageReadSessionNotFoundError();
  }

  await prisma.storageReadSession.updateMany({
    where: {
      ownerId: input.userId,
      status: "ACTIVE",
      OR: [{ expiresAt: { lte: now } }, { absoluteExpiresAt: { lte: now } }],
    },
    data: { status: "EXPIRED", revokedAt: now },
  });
  const activeCount = await prisma.storageReadSession.count({
    where: { ownerId: input.userId, status: "ACTIVE" },
  });
  if (activeCount >= MAX_ACTIVE_READ_SESSIONS) {
    throw new SecureUploadError("TOO_MANY_READ_SESSIONS", 429, "Close an existing file session and try again.");
  }

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + IDLE_TTL_MS);
  const absoluteExpiresAt = new Date(now.getTime() + ABSOLUTE_TTL_MS);
  const readSession = await prisma.storageReadSession.create({
    data: {
      ownerId: input.userId,
      projectAssetId: asset.assetId,
      tokenHash: tokenHash(token),
      operation,
      expiresAt,
      absoluteExpiresAt,
      lastUsedAt: now,
    },
    select: { id: true },
  });
  return {
    readSessionId: readSession.id,
    url: `/api/storage/read/${readSession.id}`,
    token,
    operation,
    expiresAt: expiresAt.toISOString(),
    absoluteExpiresAt: absoluteExpiresAt.toISOString(),
    assetId: asset.assetId,
    byteLength: Number(asset.byteLength),
    sha256: asset.sha256,
    contentType: asset.contentType,
  };
}

export async function authorizeStorageReadSession(input: {
  userId: string;
  readSessionId: string;
  token: string | null;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const session = await prisma.storageReadSession.findFirst({
    where: { id: input.readSessionId, ownerId: input.userId, status: "ACTIVE" },
    include: {
      projectAsset: {
        include: {
          project: { select: { id: true, name: true, userId: true, trashedAt: true } },
          storageObject: true,
        },
      },
    },
  });
  if (
    !session ||
    !input.token ||
    !tokenMatches(input.token, session.tokenHash) ||
    session.expiresAt <= now ||
    session.absoluteExpiresAt <= now ||
    session.projectAsset.deletedAt ||
    session.projectAsset.project.trashedAt ||
    session.projectAsset.project.userId !== input.userId ||
    session.projectAsset.storageObject.ownerId !== input.userId ||
    session.projectAsset.storageObject.status !== "READY" ||
    session.projectAsset.storageObject.environment !== resolveRuntimeEnvironment() ||
    session.projectAsset.storageObject.bucketClass !== "source" ||
    session.projectAsset.storageObject.kind !== "pdf-source" ||
    session.projectAsset.storageObject.contentType !== "application/pdf" ||
    session.projectAsset.storageObject.byteLength === null ||
    session.projectAsset.storageObject.byteLength <= BigInt(0) ||
    !session.projectAsset.storageObject.sha256
  ) {
    if (session && (session.expiresAt <= now || session.absoluteExpiresAt <= now)) {
      await prisma.storageReadSession.updateMany({
        where: { id: session.id, status: "ACTIVE" },
        data: { status: "EXPIRED", revokedAt: now },
      });
    }
    throw new StorageReadSessionNotFoundError();
  }

  let expiresAt = session.expiresAt;
  if (now.getTime() - session.lastUsedAt.getTime() >= ACTIVITY_UPDATE_INTERVAL_MS) {
    expiresAt = new Date(Math.min(
      now.getTime() + IDLE_TTL_MS,
      session.absoluteExpiresAt.getTime(),
    ));
    await prisma.storageReadSession.updateMany({
      where: { id: session.id, status: "ACTIVE", expiresAt: session.expiresAt },
      data: { lastUsedAt: now, expiresAt },
    });
  }
  return {
    id: session.id,
    operation: session.operation as StorageReadOperation,
    expiresAt,
    absoluteExpiresAt: session.absoluteExpiresAt,
    projectId: session.projectAsset.project.id,
    projectName: session.projectAsset.project.name,
    assetId: session.projectAsset.id,
    privateObjectKey: session.projectAsset.storageObject.objectKey,
    byteLength: Number(session.projectAsset.storageObject.byteLength),
    sha256: session.projectAsset.storageObject.sha256,
    contentType: session.projectAsset.storageObject.contentType,
  };
}

export async function revokeStorageReadSession(input: {
  userId: string;
  readSessionId: string;
  token: string | null;
  now?: Date;
}) {
  const authorized = await authorizeStorageReadSession(input);
  const now = input.now ?? new Date();
  await prisma.storageReadSession.updateMany({
    where: { id: authorized.id, ownerId: input.userId, status: "ACTIVE" },
    data: { status: "REVOKED", revokedAt: now },
  });
  return { revoked: true };
}
