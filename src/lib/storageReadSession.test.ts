import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authorizeAsset: vi.fn(),
  assetFindFirst: vi.fn(),
  updateMany: vi.fn(),
  count: vi.fn(),
  create: vi.fn(),
  findFirst: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    projectAsset: { findFirst: mocks.assetFindFirst },
    storageReadSession: {
      updateMany: mocks.updateMany,
      count: mocks.count,
      create: mocks.create,
      findFirst: mocks.findFirst,
    },
  },
}));

vi.mock("@/lib/storageAuthorization", () => ({
  authorizeProjectAsset: mocks.authorizeAsset,
  ProjectAssetNotFoundError: class ProjectAssetNotFoundError extends Error {},
}));

import {
  authorizeStorageReadSession,
  createStorageReadSession,
} from "@/lib/storageReadSession";

const now = new Date("2026-07-24T12:00:00.000Z");
const asset = {
  assetId: "asset_12345",
  environment: "development",
  bucketClass: "source",
  kind: "pdf-source",
  contentType: "application/pdf",
  byteLength: BigInt(250_000_000),
  sha256: "a".repeat(64),
};

describe("owner-bound storage read sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("STORAGE_MODEL_V2_ENABLED", "true");
    mocks.authorizeAsset.mockResolvedValue(asset);
    mocks.updateMany.mockResolvedValue({ count: 0 });
    mocks.count.mockResolvedValue(0);
    mocks.create.mockResolvedValue({ id: "read-session-1" });
  });

  it("returns an opaque header token but never the private object key", async () => {
    const result = await createStorageReadSession({
      userId: "user-1",
      projectId: "project-1",
      body: { operation: "view", assetId: "asset_12345" },
      now,
    });
    expect(result.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(result.url).toBe("/api/storage/read/read-session-1");
    expect(JSON.stringify(result)).not.toContain("objectKey");
    expect(JSON.stringify(result)).not.toContain("private-source-key");
    const createInput = mocks.create.mock.calls[0][0];
    expect(createInput.data.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(createInput.data.tokenHash).not.toBe(result.token);
  });

  it("uses the same generic not-found result for a wrong user or wrong token", async () => {
    mocks.findFirst.mockResolvedValueOnce(null);
    await expect(authorizeStorageReadSession({
      userId: "other-user",
      readSessionId: "read-session-1",
      token: "x".repeat(43),
      now,
    })).rejects.toMatchObject({ code: "STORAGE_READ_SESSION_NOT_FOUND", status: 404 });

    mocks.findFirst.mockResolvedValueOnce({
      id: "read-session-1",
      tokenHash: "a".repeat(64),
      status: "ACTIVE",
      expiresAt: new Date(now.getTime() + 60_000),
      absoluteExpiresAt: new Date(now.getTime() + 120_000),
      lastUsedAt: now,
      operation: "VIEW",
      projectAsset: {
        id: "asset_12345",
        deletedAt: null,
        project: { id: "project-1", name: "Plans", userId: "user-1", trashedAt: null },
        storageObject: {
          ownerId: "user-1", status: "READY", environment: "development", bucketClass: "source", kind: "pdf-source",
          objectKey: "private-source-key", byteLength: BigInt(100), sha256: "b".repeat(64),
          contentType: "application/pdf",
        },
      },
    });
    await expect(authorizeStorageReadSession({
      userId: "user-1",
      readSessionId: "read-session-1",
      token: "x".repeat(43),
      now,
    })).rejects.toMatchObject({ code: "STORAGE_READ_SESSION_NOT_FOUND", status: 404 });
  });

  it("slides an active session expiry without exceeding its absolute lifetime", async () => {
    const issued = await createStorageReadSession({
      userId: "user-1",
      projectId: "project-1",
      body: { operation: "view", assetId: "asset_12345" },
      now,
    });
    const later = new Date(now.getTime() + 2 * 60_000);
    const absoluteExpiresAt = new Date(now.getTime() + 5 * 60_000);
    mocks.findFirst.mockResolvedValue({
      id: issued.readSessionId,
      tokenHash: mocks.create.mock.calls[0][0].data.tokenHash,
      status: "ACTIVE",
      expiresAt: new Date(now.getTime() + 3 * 60_000),
      absoluteExpiresAt,
      lastUsedAt: now,
      operation: "VIEW",
      projectAsset: {
        id: "asset_12345",
        deletedAt: null,
        project: { id: "project-1", name: "Plans", userId: "user-1", trashedAt: null },
        storageObject: {
          ownerId: "user-1", status: "READY", environment: "development", bucketClass: "source", kind: "pdf-source",
          objectKey: "private-source-key", byteLength: BigInt(100), sha256: "b".repeat(64),
          contentType: "application/pdf",
        },
      },
    });
    const authorized = await authorizeStorageReadSession({
      userId: "user-1",
      readSessionId: issued.readSessionId,
      token: issued.token,
      now: later,
    });
    expect(authorized.expiresAt).toEqual(absoluteExpiresAt);
    expect(mocks.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({
      data: { lastUsedAt: later, expiresAt: absoluteExpiresAt },
    }));
  });
});
