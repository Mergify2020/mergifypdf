import { resolveRuntimeEnvironment } from "@/lib/runtimeEnvironment";
import {
  chooseSecureUploadPlan,
  expectedPartByteLength,
  getSecureUploadLimits,
  MAX_ACTIVE_UPLOADS,
  SecureUploadError,
  sha256HexToBase64,
  UPLOAD_SESSION_TTL_MS,
  validateCompletedParts,
  validateIdempotencyKey,
  validatePartChecksum,
  validatePdfUploadIntent,
} from "@/lib/secureUploadPolicy";
import { createPrivateObjectKey } from "@/lib/storageModel";
import { prisma } from "@/lib/prisma";
import {
  createR2SecureUploadStorage,
  type SecureUploadStorage,
} from "@/lib/secureUploadR2";

const ACTIVE_STATUSES = ["PENDING", "ACTIVE"];
const QUOTA_STATUSES = ["UPLOADING", "QUARANTINED", "READY"];

type UploadRecord = Awaited<ReturnType<typeof loadOwnedUpload>>;

export function assertSecureUploadsEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  if (env.STORAGE_MODEL_V2_ENABLED !== "true") {
    throw new SecureUploadError("SECURE_UPLOADS_DISABLED", 404, "Secure uploads are not enabled.");
  }
}

function publicStatus(upload: NonNullable<UploadRecord>) {
  return {
    uploadId: upload.id,
    projectId: upload.projectId,
    mode: upload.mode,
    status: upload.status,
    byteLength: Number(upload.expectedBytes),
    partSize: upload.partSize,
    partCount: upload.partCount,
    expiresAt: upload.expiresAt.toISOString(),
    completedAt: upload.completedAt?.toISOString() ?? null,
    safeErrorCode: upload.safeErrorCode,
    inspectionStatus: upload.inspectionJob?.status ?? null,
  };
}

async function loadOwnedUpload(userId: string, uploadId: string) {
  return prisma.uploadSession.findFirst({
    where: { id: uploadId, ownerId: userId, project: { trashedAt: null } },
    include: { storageObject: true, inspectionJob: true },
  });
}

function requireActive(upload: NonNullable<UploadRecord>) {
  if (upload.expiresAt.getTime() <= Date.now()) {
    throw new SecureUploadError("UPLOAD_EXPIRED", 410, "This upload session has expired.");
  }
  if (!ACTIVE_STATUSES.includes(upload.status)) {
    throw new SecureUploadError("UPLOAD_NOT_ACTIVE", 409, "This upload is not active.");
  }
}

function sameIntent(
  upload: NonNullable<UploadRecord>,
  intent: ReturnType<typeof validatePdfUploadIntent>,
) {
  return upload.projectId === intent.projectId &&
    upload.expectedBytes === BigInt(intent.byteLength) &&
    upload.expectedSha256 === intent.sha256 &&
    upload.contentType === intent.contentType;
}

async function signExistingUpload(
  upload: NonNullable<UploadRecord>,
  storage: SecureUploadStorage,
) {
  requireActive(upload);
  const base = publicStatus(upload);
  if (upload.mode !== "SINGLE") return base;
  return {
    ...base,
    single: await storage.signSingle({
      objectKey: upload.storageObject.objectKey,
      uploadId: upload.id,
      byteLength: Number(upload.expectedBytes),
      sha256Hex: upload.expectedSha256,
    }),
  };
}

export async function initiateSecureUpload(input: {
  userId: string;
  idempotencyKey: string | null;
  body: unknown;
  storage?: SecureUploadStorage;
  env?: Record<string, string | undefined>;
}) {
  const env = input.env ?? process.env;
  assertSecureUploadsEnabled(env);
  const storage = input.storage ?? createR2SecureUploadStorage(env);
  const intent = validatePdfUploadIntent(input.body, env);
  const idempotencyKey = validateIdempotencyKey(input.idempotencyKey);

  const existing = await prisma.uploadSession.findUnique({
    where: { ownerId_idempotencyKey: { ownerId: input.userId, idempotencyKey } },
    include: { storageObject: true, inspectionJob: true },
  });
  if (existing) {
    if (!sameIntent(existing, intent)) {
      throw new SecureUploadError("IDEMPOTENCY_CONFLICT", 409, "That upload request was already used.");
    }
    return signExistingUpload(existing, storage);
  }

  const [project, activeUploads, usage] = await Promise.all([
    prisma.project.findFirst({
      where: { id: intent.projectId, userId: input.userId, trashedAt: null },
      select: { id: true },
    }),
    prisma.uploadSession.count({
      where: { ownerId: input.userId, status: { in: ACTIVE_STATUSES }, expiresAt: { gt: new Date() } },
    }),
    prisma.storageObject.aggregate({
      where: { ownerId: input.userId, status: { in: QUOTA_STATUSES } },
      _sum: { byteLength: true },
    }),
  ]);
  if (!project) throw new SecureUploadError("NOT_FOUND", 404, "Project not found.");
  if (activeUploads >= MAX_ACTIVE_UPLOADS) {
    throw new SecureUploadError("TOO_MANY_UPLOADS", 429, "Finish or cancel an active upload first.");
  }
  const usedBytes = usage._sum.byteLength ?? BigInt(0);
  if (usedBytes + BigInt(intent.byteLength) > BigInt(getSecureUploadLimits(env).userQuotaBytes)) {
    throw new SecureUploadError("STORAGE_QUOTA_EXCEEDED", 413, "Your private storage quota would be exceeded.");
  }

  const plan = chooseSecureUploadPlan(intent.byteLength);
  const runtime = resolveRuntimeEnvironment(env);
  const objectKey = createPrivateObjectKey({
    environment: runtime,
    bucketClass: "incoming",
    kind: "pdf-source",
  });
  const expiresAt = new Date(Date.now() + UPLOAD_SESSION_TTL_MS);
  const upload = await prisma.$transaction(async (tx) => {
    const object = await tx.storageObject.create({
      data: {
        ownerId: input.userId,
        environment: runtime,
        bucketClass: "incoming",
        objectKey,
        kind: "pdf-source",
        status: "UPLOADING",
        contentType: intent.contentType,
        byteLength: BigInt(intent.byteLength),
        sha256: intent.sha256,
        expiresAt,
      },
    });
    return tx.uploadSession.create({
      data: {
        ownerId: input.userId,
        projectId: project.id,
        storageObjectId: object.id,
        expectedBytes: BigInt(intent.byteLength),
        expectedSha256: intent.sha256,
        contentType: intent.contentType,
        idempotencyKey,
        mode: plan.mode,
        partSize: plan.partSize,
        partCount: plan.partCount,
        status: "ACTIVE",
        expiresAt,
      },
      include: { storageObject: true, inspectionJob: true },
    });
  });

  try {
    if (plan.mode === "MULTIPART") {
      const multipartUploadId = await storage.createMultipart({ objectKey, uploadId: upload.id });
      upload.multipartUploadId = multipartUploadId;
      await prisma.uploadSession.update({
        where: { id: upload.id },
        data: { multipartUploadId },
      });
    }
    return signExistingUpload(upload, storage);
  } catch {
    await prisma.$transaction([
      prisma.uploadSession.update({ where: { id: upload.id }, data: { status: "REJECTED", safeErrorCode: "STORAGE_INIT_FAILED" } }),
      prisma.storageObject.update({ where: { id: upload.storageObjectId }, data: { status: "REJECTED" } }),
    ]);
    throw new SecureUploadError("STORAGE_UNAVAILABLE", 503, "Private upload storage is temporarily unavailable.");
  }
}

export async function signSecureUploadParts(input: {
  userId: string;
  uploadId: string;
  body: unknown;
  storage?: SecureUploadStorage;
}) {
  assertSecureUploadsEnabled();
  const storage = input.storage ?? createR2SecureUploadStorage();
  const upload = await loadOwnedUpload(input.userId, input.uploadId);
  if (!upload) throw new SecureUploadError("NOT_FOUND", 404, "Upload not found.");
  requireActive(upload);
  if (upload.mode !== "MULTIPART" || !upload.partSize || !upload.partCount || !upload.multipartUploadId) {
    throw new SecureUploadError("INVALID_UPLOAD_MODE", 409, "This upload does not use parts.");
  }
  const requested = (input.body as { parts?: unknown })?.parts;
  if (!Array.isArray(requested) || requested.length < 1 || requested.length > 20) {
    throw new SecureUploadError("INVALID_PART_BATCH", 400, "Request between 1 and 20 upload parts.");
  }
  const seen = new Set<number>();
  const parts = await Promise.all(requested.map(async (entry) => {
    const record = entry as Record<string, unknown>;
    const partNumber = record?.partNumber;
    if (!Number.isInteger(partNumber) || seen.has(partNumber as number)) {
      throw new SecureUploadError("INVALID_PART", 400, "Invalid upload part.");
    }
    seen.add(partNumber as number);
    const checksumSHA256 = validatePartChecksum(record.checksumSHA256);
    const byteLength = expectedPartByteLength(
      Number(upload.expectedBytes), upload.partSize!, upload.partCount!, partNumber as number,
    );
    const signed = await storage.signPart({
      objectKey: upload.storageObject.objectKey,
      multipartUploadId: upload.multipartUploadId!,
      partNumber: partNumber as number,
      byteLength,
      checksumSHA256,
    });
    return { partNumber, byteLength, ...signed };
  }));
  return { uploadId: upload.id, parts };
}

async function rejectUpload(upload: NonNullable<UploadRecord>, storage: SecureUploadStorage, code: string) {
  let cleanupFailed = false;
  try { await storage.deleteObject(upload.storageObject.objectKey); } catch { cleanupFailed = true; }
  await prisma.$transaction(async (tx) => {
    await tx.uploadSession.update({ where: { id: upload.id }, data: { status: "REJECTED", safeErrorCode: code } });
    await tx.storageObject.update({
      where: { id: upload.storageObjectId },
      data: cleanupFailed ? { status: "DELETING" } : { status: "REJECTED", deletedAt: new Date() },
    });
    if (cleanupFailed) {
      await tx.storageDeletionJob.upsert({
        where: { storageObjectId: upload.storageObjectId },
        update: { status: "PENDING", nextAttemptAt: new Date(), lastErrorCode: "REJECTED_UPLOAD_CLEANUP_FAILED" },
        create: { storageObjectId: upload.storageObjectId, lastErrorCode: "REJECTED_UPLOAD_CLEANUP_FAILED" },
      });
    }
  });
}

export async function completeSecureUpload(input: {
  userId: string;
  uploadId: string;
  body: unknown;
  storage?: SecureUploadStorage;
}) {
  assertSecureUploadsEnabled();
  const storage = input.storage ?? createR2SecureUploadStorage();
  const upload = await loadOwnedUpload(input.userId, input.uploadId);
  if (!upload) throw new SecureUploadError("NOT_FOUND", 404, "Upload not found.");
  if (upload.status === "QUARANTINED") return publicStatus(upload);
  requireActive(upload);

  let stored = await storage.head(upload.storageObject.objectKey);
  if (upload.mode === "MULTIPART" && !stored) {
    if (!upload.partCount || !upload.multipartUploadId) {
      throw new SecureUploadError("UPLOAD_NOT_READY", 409, "Multipart upload is not initialized.");
    }
    const parts = validateCompletedParts((input.body as { parts?: unknown })?.parts, upload.partCount);
    await storage.completeMultipart({
      objectKey: upload.storageObject.objectKey,
      multipartUploadId: upload.multipartUploadId,
      parts,
    });
  }

  stored = await storage.head(upload.storageObject.objectKey);
  const expectedChecksum = sha256HexToBase64(upload.expectedSha256);
  const invalid = !stored ||
    stored.byteLength !== Number(upload.expectedBytes) ||
    stored.contentType !== "application/pdf" ||
    stored.uploadId !== upload.id ||
    (upload.mode === "SINGLE" && stored.checksumSHA256 !== expectedChecksum);
  if (invalid) {
    await rejectUpload(upload, storage, "OBJECT_VERIFICATION_FAILED");
    throw new SecureUploadError("OBJECT_VERIFICATION_FAILED", 422, "The uploaded PDF failed integrity checks.");
  }

  const completedAt = new Date();
  await prisma.$transaction([
    prisma.uploadSession.update({ where: { id: upload.id }, data: { status: "QUARANTINED", completedAt } }),
    prisma.storageObject.update({ where: { id: upload.storageObjectId }, data: { status: "QUARANTINED" } }),
    prisma.storageInspectionJob.upsert({
      where: { uploadSessionId: upload.id },
      update: { status: "PENDING", nextAttemptAt: completedAt, safeErrorCode: null },
      create: { uploadSessionId: upload.id, storageObjectId: upload.storageObjectId },
    }),
  ]);
  return { ...publicStatus({ ...upload, status: "QUARANTINED", completedAt }), inspectionStatus: "PENDING" };
}

export async function getSecureUploadStatus(userId: string, uploadId: string) {
  assertSecureUploadsEnabled();
  const upload = await loadOwnedUpload(userId, uploadId);
  if (!upload) throw new SecureUploadError("NOT_FOUND", 404, "Upload not found.");
  return publicStatus(upload);
}

export async function cancelSecureUpload(
  userId: string,
  uploadId: string,
  storage: SecureUploadStorage = createR2SecureUploadStorage(),
) {
  assertSecureUploadsEnabled();
  const upload = await loadOwnedUpload(userId, uploadId);
  if (!upload) throw new SecureUploadError("NOT_FOUND", 404, "Upload not found.");
  if (["CANCELLED", "REJECTED"].includes(upload.status)) return publicStatus(upload);
  if (upload.status === "QUARANTINED" || upload.status === "READY") {
    throw new SecureUploadError("UPLOAD_ALREADY_COMPLETED", 409, "A completed upload cannot be cancelled here.");
  }

  let cleanupFailed = false;
  try {
    if (upload.multipartUploadId) {
      await storage.abortMultipart(upload.storageObject.objectKey, upload.multipartUploadId);
    }
    await storage.deleteObject(upload.storageObject.objectKey);
  } catch {
    cleanupFailed = true;
  }
  const cancelledAt = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.uploadSession.update({ where: { id: upload.id }, data: { status: "CANCELLED", cancelledAt } });
    await tx.storageObject.update({
      where: { id: upload.storageObjectId },
      data: cleanupFailed ? { status: "DELETING" } : { status: "DELETED", deletedAt: cancelledAt },
    });
    if (cleanupFailed) {
      await tx.storageDeletionJob.upsert({
        where: { storageObjectId: upload.storageObjectId },
        update: { status: "PENDING", nextAttemptAt: new Date(), lastErrorCode: "UPLOAD_CLEANUP_FAILED" },
        create: { storageObjectId: upload.storageObjectId, lastErrorCode: "UPLOAD_CLEANUP_FAILED" },
      });
    }
  });
  return { ...publicStatus({ ...upload, status: "CANCELLED", cancelledAt }), cleanupPending: cleanupFailed };
}
