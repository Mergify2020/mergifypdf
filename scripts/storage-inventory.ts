import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { loadEnvConfig } from "@next/env";
import { prisma } from "../src/lib/prisma";
import { getR2Config } from "../src/lib/r2";

loadEnvConfig(process.cwd());

type LegacyKeyKind = "pdf" | "preview" | "other";
type OptionalResult<T> = T | { unavailable: true };

function classifyLegacyKey(key: string): LegacyKeyKind {
  if (/^[A-Za-z0-9_-]+\.pdf$/i.test(key)) return "pdf";
  if (/^[A-Za-z0-9_-]+\.(png|jpe?g|webp)$/i.test(key)) return "preview";
  return "other";
}

function configured(names: readonly string[]) {
  return names.every((name) => Boolean(process.env[name]?.trim()));
}

async function optional<T>(operation: Promise<T>): Promise<OptionalResult<T>> {
  try {
    return await operation;
  } catch (error: unknown) {
    const code = error && typeof error === "object" && "code" in error ? error.code : null;
    if (code === "P2021") return { unavailable: true };
    throw error;
  }
}

async function inspectLegacyBucket() {
  const required = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"] as const;
  if (!configured(required)) return { configured: false, sampled: false };

  const config = getR2Config();
  const result = await config.client.send(new ListObjectsV2Command({ Bucket: config.bucket, MaxKeys: 1_000 }));
  const keys = result.Contents ?? [];
  const kinds: Record<LegacyKeyKind, number> = { pdf: 0, preview: 0, other: 0 };
  let sampleBytes = 0;
  for (const object of keys) {
    kinds[classifyLegacyKey(object.Key ?? "")] += 1;
    sampleBytes += object.Size ?? 0;
  }

  return {
    configured: true,
    sampled: true,
    sampleLimit: 1_000,
    sampledObjects: keys.length,
    sampledBytes: sampleBytes,
    sampleKeyPatterns: kinds,
    hasMoreObjects: Boolean(result.IsTruncated),
  };
}

function absent(value: OptionalResult<unknown>) {
  return typeof value === "object" && value !== null && "unavailable" in value;
}

async function main() {
  const [users, projects, trashedProjects, projectsWithPdf, projectsWithPreview, legacyPdfKeyGroups, legacyPreviewKeyGroups] = await Promise.all([
    prisma.user.count(),
    prisma.project.count(),
    prisma.project.count({ where: { trashedAt: { not: null } } }),
    prisma.project.count({ where: { pdfKey: { not: null } } }),
    prisma.project.count({ where: { previewKey: { not: null } } }),
    prisma.project.groupBy({ by: ["pdfKey"], where: { pdfKey: { not: null } }, _count: { _all: true } }),
    prisma.project.groupBy({ by: ["previewKey"], where: { previewKey: { not: null } }, _count: { _all: true } }),
  ]);

  const [storageObjects, projectAssets, uploadStatuses, inspectionStatuses, deletionStatuses, runtimeGuards, bucket] = await Promise.all([
    optional(prisma.storageObject.groupBy({ by: ["environment", "bucketClass", "status"], _count: { _all: true }, _sum: { byteLength: true } })),
    optional(prisma.projectAsset.count({ where: { deletedAt: null } })),
    optional(prisma.uploadSession.groupBy({ by: ["status"], _count: { _all: true } })),
    optional(prisma.storageInspectionJob.groupBy({ by: ["status"], _count: { _all: true } })),
    optional(prisma.storageDeletionJob.groupBy({ by: ["status"], _count: { _all: true } })),
    optional(prisma.appRuntimeGuard.findMany({ select: { appName: true, environment: true, databaseLabel: true, requireUsers: true } })),
    inspectLegacyBucket(),
  ]);

  const secureStorageSchemaAvailable = ![storageObjects, projectAssets, uploadStatuses, inspectionStatuses, deletionStatuses, runtimeGuards].some(absent);
  const report = {
    generatedAt: new Date().toISOString(),
    mode: "read-only",
    note: "This report contains aggregate counts only. It never prints secrets, database targets, customer identities, object keys, URLs, or file contents.",
    runtime: {
      application: process.env.APP_RUNTIME_ENV ?? "development",
      storageV2Enabled: process.env.STORAGE_MODEL_V2_ENABLED === "true",
      legacyR2Configured: bucket.configured,
    },
    database: {
      users, projects, trashedProjects, projectsWithPdf, projectsWithPreview,
      duplicatePdfKeyReferences: legacyPdfKeyGroups.filter((group) => group._count._all > 1).length,
      duplicatePreviewKeyReferences: legacyPreviewKeyGroups.filter((group) => group._count._all > 1).length,
      secureStorageSchemaAvailable,
      runtimeGuards: absent(runtimeGuards) ? [] : runtimeGuards,
    },
    secureStorage: secureStorageSchemaAvailable
      ? {
          objects: (storageObjects as Array<{ environment: string; bucketClass: string; status: string; _count: { _all: number }; _sum: { byteLength: bigint | null } }>).map((group) => ({
            environment: group.environment, bucketClass: group.bucketClass, status: group.status,
            count: group._count._all, bytes: group._sum.byteLength?.toString() ?? "0",
          })),
          activeProjectAssets: projectAssets,
          uploadStatuses,
          inspectionStatuses,
          deletionStatuses,
        }
      : { unavailable: "Storage v2 database migrations have not been applied." },
    legacyBucket: bucket,
  };
  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((error: unknown) => {
    console.error("Storage inventory failed without disclosing configuration values.");
    const code = error && typeof error === "object" && "code" in error ? error.code : null;
    if (typeof code === "string" && /^P\\d{4}$/.test(code)) console.error("Database error code: " + code);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
