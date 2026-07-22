import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertRuntimeEnvironmentSafe, resolveRuntimeEnvironment } from "@/lib/runtimeEnvironment";
import { createPrivateObjectKey } from "@/lib/storageModel";
import { getSecureUploadLimits, sha256HexToBase64 } from "@/lib/secureUploadPolicy";
import {
  inspectQuarantinedPdf,
  QuarantineInspectionError,
  type InspectedPdfArtifact,
} from "@/lib/quarantineInspection";
import {
  createQuarantineStorage,
  type QuarantineStorage,
} from "@/lib/quarantineStorage";

const LEASE_MS = 10 * 60 * 1000;

type Inspector = typeof inspectQuarantinedPdf;

export type InspectionWorkerDependencies = {
  storage?: QuarantineStorage;
  inspect?: Inspector;
  env?: Record<string, string | undefined>;
  now?: () => Date;
};

export async function claimStorageInspectionJob(now = new Date()) {
  const leaseToken = randomUUID();
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id"
      FROM "StorageInspectionJob"
      WHERE (
        ("status" IN ('PENDING', 'RETRY') AND "nextAttemptAt" <= ${now})
        OR ("status" = 'PROCESSING' AND "leaseExpiresAt" < ${now})
      )
      AND "attempts" < "maxAttempts"
      ORDER BY "nextAttemptAt" ASC, "createdAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    `);
    const id = rows[0]?.id;
    if (!id) return null;
    return tx.storageInspectionJob.update({
      where: { id },
      data: {
        status: "PROCESSING",
        attempts: { increment: 1 },
        leaseToken,
        leaseExpiresAt: new Date(now.getTime() + LEASE_MS),
        startedAt: now,
        safeErrorCode: null,
      },
      select: { id: true, leaseToken: true },
    });
  });
}

async function loadClaimedJob(id: string, leaseToken: string) {
  return prisma.storageInspectionJob.findFirst({
    where: { id, leaseToken, status: "PROCESSING" },
    include: {
      storageObject: true,
      uploadSession: true,
    },
  });
}

async function queueObjectDeletion(storageObjectId: string, safeCode: string) {
  await prisma.storageDeletionJob.upsert({
    where: { storageObjectId },
    update: { status: "PENDING", nextAttemptAt: new Date(), lastErrorCode: safeCode },
    create: { storageObjectId, lastErrorCode: safeCode },
  });
}

async function rejectUnsafeJob(input: {
  job: NonNullable<Awaited<ReturnType<typeof loadClaimedJob>>>;
  storage: QuarantineStorage;
  code: string;
  now: Date;
}) {
  let deleted = false;
  try {
    await input.storage.deleteIncoming(input.job.storageObject.objectKey);
    deleted = true;
  } catch {
    // A durable deletion job is created below.
  }
  await prisma.$transaction(async (tx) => {
    await tx.storageInspectionJob.update({
      where: { id: input.job.id },
      data: {
        status: "REJECTED",
        safeErrorCode: input.code,
        leaseToken: null,
        leaseExpiresAt: null,
        completedAt: input.now,
      },
    });
    await tx.uploadSession.update({
      where: { id: input.job.uploadSessionId },
      data: { status: "REJECTED", safeErrorCode: input.code },
    });
    await tx.storageObject.update({
      where: { id: input.job.storageObjectId },
      data: deleted
        ? { status: "DELETED", deletedAt: input.now }
        : { status: "DELETING" },
    });
    if (!deleted) {
      await tx.storageDeletionJob.upsert({
        where: { storageObjectId: input.job.storageObjectId },
        update: { status: "PENDING", nextAttemptAt: input.now, lastErrorCode: "UNSAFE_UPLOAD_CLEANUP_FAILED" },
        create: { storageObjectId: input.job.storageObjectId, lastErrorCode: "UNSAFE_UPLOAD_CLEANUP_FAILED" },
      });
    }
    await tx.storageAuditEvent.create({
      data: {
        actorId: input.job.uploadSession.ownerId,
        projectId: input.job.uploadSession.projectId,
        action: "storage.inspect",
        outcome: "rejected",
        safeCode: input.code,
      },
    });
  });
}

async function recordOperationalFailure(
  job: NonNullable<Awaited<ReturnType<typeof loadClaimedJob>>>,
  code: string,
  now: Date,
) {
  const terminal = job.attempts >= job.maxAttempts;
  const delayMinutes = Math.min(60, 2 ** Math.max(0, job.attempts - 1));
  await prisma.$transaction([
    prisma.storageInspectionJob.update({
      where: { id: job.id },
      data: {
        status: terminal ? "FAILED" : "RETRY",
        safeErrorCode: code,
        nextAttemptAt: new Date(now.getTime() + delayMinutes * 60_000),
        leaseToken: null,
        leaseExpiresAt: null,
        completedAt: terminal ? now : null,
      },
    }),
    prisma.uploadSession.update({
      where: { id: job.uploadSessionId },
      data: { safeErrorCode: code },
    }),
    prisma.storageAuditEvent.create({
      data: {
        actorId: job.uploadSession.ownerId,
        projectId: job.uploadSession.projectId,
        action: "storage.inspect",
        outcome: terminal ? "failed" : "retry",
        safeCode: code,
      },
    }),
  ]);
}

async function promoteVerifiedArtifact(input: {
  job: NonNullable<Awaited<ReturnType<typeof loadClaimedJob>>>;
  artifact: InspectedPdfArtifact;
  storage: QuarantineStorage;
  env: Record<string, string | undefined>;
  now: Date;
}) {
  const runtime = resolveRuntimeEnvironment(input.env);
  const sourceKey = createPrivateObjectKey({
    environment: runtime,
    bucketClass: "source",
    kind: "pdf-source",
  });
  const sourceObject = await prisma.storageObject.create({
    data: {
      ownerId: input.job.uploadSession.ownerId,
      environment: runtime,
      bucketClass: "source",
      objectKey: sourceKey,
      kind: "pdf-source",
      status: "UPLOADING",
      contentType: "application/pdf",
      byteLength: BigInt(input.artifact.byteLength),
      sha256: input.artifact.sha256,
    },
  });

  try {
    await input.storage.putVerifiedSource({
      objectKey: sourceKey,
      filePath: input.artifact.filePath,
      byteLength: input.artifact.byteLength,
      sha256Hex: input.artifact.sha256,
      uploadId: input.job.uploadSessionId,
    });
    const stored = await input.storage.headSource(sourceKey);
    if (
      !stored ||
      stored.byteLength !== input.artifact.byteLength ||
      stored.contentType !== "application/pdf" ||
      stored.uploadId !== input.job.uploadSessionId ||
      stored.checksumSHA256 !== sha256HexToBase64(input.artifact.sha256)
    ) {
      throw new QuarantineInspectionError("SOURCE_VERIFICATION_FAILED", "operational", "Verified storage failed validation.");
    }

    await prisma.$transaction(async (tx) => {
      const latest = await tx.projectAsset.aggregate({
        where: { projectId: input.job.uploadSession.projectId, role: "SOURCE" },
        _max: { revision: true },
      });
      await tx.projectAsset.updateMany({
        where: { projectId: input.job.uploadSession.projectId, role: "SOURCE", deletedAt: null },
        data: { deletedAt: input.now },
      });
      await tx.projectAsset.create({
        data: {
          projectId: input.job.uploadSession.projectId,
          storageObjectId: sourceObject.id,
          role: "SOURCE",
          revision: (latest._max.revision ?? 0) + 1,
        },
      });
      await tx.storageObject.update({
        where: { id: sourceObject.id },
        data: { status: "READY", readyAt: input.now },
      });
      await tx.storageObject.update({
        where: { id: input.job.storageObjectId },
        data: { status: "DELETING" },
      });
      await tx.uploadSession.update({
        where: { id: input.job.uploadSessionId },
        data: { status: "READY", safeErrorCode: null },
      });
      await tx.storageInspectionJob.update({
        where: { id: input.job.id },
        data: {
          status: "COMPLETED",
          safeErrorCode: null,
          leaseToken: null,
          leaseExpiresAt: null,
          completedAt: input.now,
        },
      });
      await tx.storageAuditEvent.create({
        data: {
          actorId: input.job.uploadSession.ownerId,
          projectId: input.job.uploadSession.projectId,
          action: "storage.inspect",
          outcome: "approved",
        },
      });
    });
  } catch (error) {
    try { await input.storage.deleteSource(sourceKey); } catch { /* durable cleanup below */ }
    await prisma.storageObject.update({ where: { id: sourceObject.id }, data: { status: "DELETING" } });
    await queueObjectDeletion(sourceObject.id, "SOURCE_PROMOTION_CLEANUP");
    throw error;
  }

  try {
    await input.storage.deleteIncoming(input.job.storageObject.objectKey);
    await prisma.storageObject.update({
      where: { id: input.job.storageObjectId },
      data: { status: "DELETED", deletedAt: input.now },
    });
  } catch {
    await queueObjectDeletion(input.job.storageObjectId, "INCOMING_CLEANUP_FAILED");
  }
}

export async function processStorageInspectionJob(
  id: string,
  leaseToken: string,
  dependencies: InspectionWorkerDependencies = {},
) {
  const env = dependencies.env ?? process.env;
  assertRuntimeEnvironmentSafe(env);
  if (env.STORAGE_MODEL_V2_ENABLED !== "true") throw new Error("Secure storage model v2 is disabled.");
  const storage = dependencies.storage ?? createQuarantineStorage(env);
  const inspect = dependencies.inspect ?? inspectQuarantinedPdf;
  const now = dependencies.now?.() ?? new Date();
  const job = await loadClaimedJob(id, leaseToken);
  if (!job) return { outcome: "lost-lease" as const };
  if (job.storageObject.status !== "QUARANTINED" || job.uploadSession.status !== "QUARANTINED") {
    await recordOperationalFailure(job, "INVALID_QUARANTINE_STATE", now);
    return { outcome: "retry" as const };
  }

  let artifact: InspectedPdfArtifact | null = null;
  try {
    const source = await storage.openIncoming(job.storageObject.objectKey);
    artifact = await inspect({
      source,
      expectedBytes: Number(job.uploadSession.expectedBytes),
      expectedSha256: job.uploadSession.expectedSha256,
      maximumBytes: getSecureUploadLimits(env).maxUploadBytes,
      temporaryRoot: env.STORAGE_INSPECTION_TMP_DIR,
    });
    await promoteVerifiedArtifact({ job, artifact, storage, env, now });
    return { outcome: "approved" as const };
  } catch (error) {
    if (error instanceof QuarantineInspectionError && error.category === "unsafe") {
      await rejectUnsafeJob({ job, storage, code: error.code, now });
      return { outcome: "rejected" as const, code: error.code };
    }
    const code = error instanceof QuarantineInspectionError
      ? error.code
      : "INSPECTION_OPERATION_FAILED";
    await recordOperationalFailure(job, code, now);
    return { outcome: "retry" as const, code };
  } finally {
    await artifact?.dispose();
  }
}

export async function processNextStorageInspectionJob(dependencies: InspectionWorkerDependencies = {}) {
  const claimed = await claimStorageInspectionJob(dependencies.now?.() ?? new Date());
  if (!claimed?.leaseToken) return { outcome: "idle" as const };
  return processStorageInspectionJob(claimed.id, claimed.leaseToken, dependencies);
}
