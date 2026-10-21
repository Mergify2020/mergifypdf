import { describe, expect, it, vi } from "vitest";
import {
  authorizeProjectAsset,
  ProjectAssetNotFoundError,
} from "@/lib/storageAuthorization";

function readyAsset() {
  return {
    id: "asset-reference",
    role: "SOURCE",
    revision: 1,
    projectId: "project-a",
    storageObject: {
      id: "storage-object",
      objectKey: "private-object-key",
      environment: "preview",
      bucketClass: "source",
      kind: "pdf-source",
      status: "READY",
      contentType: "application/pdf",
      byteLength: BigInt(100),
      sha256: "abc",
      expiresAt: null,
    },
  };
}

describe("authorizeProjectAsset", () => {
  it("scopes the lookup to both project and storage ownership", async () => {
    const findFirst = vi.fn().mockResolvedValue(readyAsset());
    const result = await authorizeProjectAsset(
      { userId: "user-a", projectId: "project-a", assetId: "asset-reference", operation: "view" },
      { projectAsset: { findFirst } } as never,
    );
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: "asset-reference",
        projectId: "project-a",
        project: { userId: "user-a", trashedAt: null },
        storageObject: { ownerId: "user-a", deletedAt: null },
      }),
    }));
    expect(result.privateObjectKey).toBe("private-object-key");
  });

  it("uses the same generic not-found error for missing and unavailable assets", async () => {
    const missing = { projectAsset: { findFirst: vi.fn().mockResolvedValue(null) } } as never;
    await expect(authorizeProjectAsset(
      { userId: "user-b", projectId: "project-a", assetId: "asset-reference", operation: "view" },
      missing,
    )).rejects.toBeInstanceOf(ProjectAssetNotFoundError);

    const processing = readyAsset();
    processing.storageObject.status = "QUARANTINED";
    const unavailable = { projectAsset: { findFirst: vi.fn().mockResolvedValue(processing) } } as never;
    await expect(authorizeProjectAsset(
      { userId: "user-a", projectId: "project-a", assetId: "asset-reference", operation: "download" },
      unavailable,
    )).rejects.toMatchObject({ status: 404, code: "PROJECT_ASSET_NOT_FOUND" });
  });
});
