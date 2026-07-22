import { prisma } from "@/lib/prisma";

export const PROJECT_ASSET_OPERATIONS = ["view", "preview", "download", "copy", "export", "delete"] as const;
export type ProjectAssetOperation = (typeof PROJECT_ASSET_OPERATIONS)[number];
const READY_OPERATIONS = new Set<ProjectAssetOperation>(["view", "preview", "download", "copy", "export"]);
type StorageAuthorizationClient = Pick<typeof prisma, "projectAsset">;

export class ProjectAssetNotFoundError extends Error {
  readonly status = 404;
  readonly code = "PROJECT_ASSET_NOT_FOUND";
  constructor() {
    super("Project asset not found.");
    this.name = "ProjectAssetNotFoundError";
  }
}

export async function authorizeProjectAsset(
  input: { userId: string; projectId: string; assetId: string; operation: ProjectAssetOperation },
  db: StorageAuthorizationClient = prisma,
) {
  const asset = await db.projectAsset.findFirst({
    where: {
      id: input.assetId,
      projectId: input.projectId,
      deletedAt: null,
      project: { userId: input.userId, ...(input.operation === "delete" ? {} : { trashedAt: null }) },
      storageObject: { ownerId: input.userId, deletedAt: null },
    },
    select: {
      id: true, role: true, revision: true, projectId: true,
      storageObject: {
        select: {
          id: true, objectKey: true, environment: true, bucketClass: true, kind: true,
          status: true, contentType: true, byteLength: true, sha256: true, expiresAt: true,
        },
      },
    },
  });
  if (!asset) throw new ProjectAssetNotFoundError();
  const status = asset.storageObject.status;
  if (READY_OPERATIONS.has(input.operation) && status !== "READY") throw new ProjectAssetNotFoundError();
  if (input.operation === "delete" && status === "DELETED") throw new ProjectAssetNotFoundError();
  return {
    assetId: asset.id, projectId: asset.projectId, role: asset.role, revision: asset.revision,
    storageObjectId: asset.storageObject.id, privateObjectKey: asset.storageObject.objectKey,
    environment: asset.storageObject.environment, bucketClass: asset.storageObject.bucketClass,
    kind: asset.storageObject.kind, status, contentType: asset.storageObject.contentType,
    byteLength: asset.storageObject.byteLength, sha256: asset.storageObject.sha256,
    expiresAt: asset.storageObject.expiresAt,
  };
}
