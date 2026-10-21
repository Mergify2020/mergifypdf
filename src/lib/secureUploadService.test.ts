import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SecureUploadStorage } from "@/lib/secureUploadR2";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findFirstProject: vi.fn(),
  count: vi.fn(),
  aggregate: vi.fn(),
  findFirstUpload: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    uploadSession: {
      findUnique: mocks.findUnique,
      findFirst: mocks.findFirstUpload,
      count: mocks.count,
    },
    project: { findFirst: mocks.findFirstProject },
    storageObject: { aggregate: mocks.aggregate },
    $transaction: mocks.transaction,
  },
}));

import { getSecureUploadStatus, initiateSecureUpload } from "@/lib/secureUploadService";

const env = {
  STORAGE_MODEL_V2_ENABLED: "true",
  APP_RUNTIME_ENV: "development",
  SECURE_STORAGE_USER_QUOTA_BYTES: "104857600",
};
const body = {
  projectId: "project_12345",
  fileName: "plans.pdf",
  contentType: "application/pdf",
  byteLength: 1024,
  sha256: "a".repeat(64),
};

function storage(): SecureUploadStorage {
  return {
    signSingle: vi.fn().mockResolvedValue({ url: "https://write-only.invalid", headers: {}, expiresInSeconds: 300 }),
    createMultipart: vi.fn(),
    signPart: vi.fn(),
    completeMultipart: vi.fn(),
    head: vi.fn(),
    abortMultipart: vi.fn(),
    deleteObject: vi.fn(),
  };
}

describe("secure upload service authorization and quotas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("STORAGE_MODEL_V2_ENABLED", "true");
  });

  it("returns the same generic not-found result for inaccessible uploads", async () => {
    mocks.findFirstUpload.mockResolvedValue(null);
    await expect(getSecureUploadStatus("another-user", "private-upload"))
      .rejects.toMatchObject({ code: "NOT_FOUND", status: 404 });
  });

  it("rejects an upload that would exceed the private user quota", async () => {
    mocks.findUnique.mockResolvedValue(null);
    mocks.findFirstProject.mockResolvedValue({ id: body.projectId });
    mocks.count.mockResolvedValue(0);
    mocks.aggregate.mockResolvedValue({ _sum: { byteLength: BigInt(104857600) } });
    await expect(initiateSecureUpload({
      userId: "user-1",
      idempotencyKey: "idempotency_key_123456",
      body,
      storage: storage(),
      env,
    })).rejects.toMatchObject({ code: "STORAGE_QUOTA_EXCEEDED", status: 413 });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("never returns the randomized private object key to the browser", async () => {
    mocks.findUnique.mockResolvedValue(null);
    mocks.findFirstProject.mockResolvedValue({ id: body.projectId });
    mocks.count.mockResolvedValue(0);
    mocks.aggregate.mockResolvedValue({ _sum: { byteLength: BigInt(0) } });
    mocks.transaction.mockImplementation(async (operation) => operation({
      storageObject: {
        create: vi.fn().mockResolvedValue({ id: "object-1" }),
      },
      uploadSession: {
        create: vi.fn().mockResolvedValue({
          id: "upload-1",
          ownerId: "user-1",
          projectId: body.projectId,
          storageObjectId: "object-1",
          expectedBytes: BigInt(1024),
          expectedSha256: body.sha256,
          contentType: body.contentType,
          mode: "SINGLE",
          partSize: null,
          partCount: null,
          status: "ACTIVE",
          safeErrorCode: null,
          expiresAt: new Date(Date.now() + 60_000),
          completedAt: null,
          cancelledAt: null,
          storageObject: { objectKey: "v2/development/incoming/pdf-source/secret" },
        }),
      },
    }));
    const result = await initiateSecureUpload({
      userId: "user-1",
      idempotencyKey: "idempotency_key_123456",
      body,
      storage: storage(),
      env,
    });
    expect(JSON.stringify(result)).not.toContain("objectKey");
    expect(JSON.stringify(result)).not.toContain("pdf-source/secret");
  });
});
