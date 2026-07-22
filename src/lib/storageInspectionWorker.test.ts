import { Readable } from "node:stream";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { QuarantineStorage } from "@/lib/quarantineStorage";
import { QuarantineInspectionError } from "@/lib/quarantineInspection";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  jobUpdate: vi.fn(),
  uploadUpdate: vi.fn(),
  objectUpdate: vi.fn(),
  objectCreate: vi.fn(),
  deletionUpsert: vi.fn(),
  auditCreate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    storageInspectionJob: { findFirst: mocks.findFirst, update: mocks.jobUpdate },
    uploadSession: { update: mocks.uploadUpdate },
    storageObject: { update: mocks.objectUpdate, create: mocks.objectCreate },
    storageDeletionJob: { upsert: mocks.deletionUpsert },
    storageAuditEvent: { create: mocks.auditCreate },
    $transaction: mocks.transaction,
  },
}));

import { processStorageInspectionJob } from "@/lib/storageInspectionWorker";

const env = {
  APP_RUNTIME_ENV: "development",
  STORAGE_MODEL_V2_ENABLED: "true",
  R2_BUCKET_ENVIRONMENT: "development",
  R2_ACCOUNT_ID: "developmentaccount1234",
  R2_ACCESS_KEY_ID: "test-access",
  R2_SECRET_ACCESS_KEY: "test-secret",
  R2_INCOMING_BUCKET: "development-incoming",
  R2_SOURCE_BUCKET: "development-source",
  R2_DERIVED_BUCKET: "development-derived",
  R2_EXPECTED_ACCOUNT_ID: "developmentaccount1234",
  R2_EXPECTED_INCOMING_BUCKET: "development-incoming",
  R2_EXPECTED_SOURCE_BUCKET: "development-source",
  R2_EXPECTED_DERIVED_BUCKET: "development-derived",
};

const job = {
  id: "job-1",
  leaseToken: "lease-1",
  status: "PROCESSING",
  attempts: 1,
  maxAttempts: 5,
  uploadSessionId: "upload-1",
  storageObjectId: "incoming-object-1",
  storageObject: { id: "incoming-object-1", objectKey: "private-incoming-key", status: "QUARANTINED" },
  uploadSession: {
    id: "upload-1",
    ownerId: "user-1",
    projectId: "project-1",
    status: "QUARANTINED",
    expectedBytes: BigInt(20),
    expectedSha256: "a".repeat(64),
  },
};

function storage(): QuarantineStorage {
  return {
    openIncoming: vi.fn().mockResolvedValue(Readable.from("%PDF-1.7\n%%EOF")),
    putVerifiedSource: vi.fn(),
    headSource: vi.fn(),
    deleteIncoming: vi.fn().mockResolvedValue(undefined),
    deleteSource: vi.fn(),
  };
}

describe("storage inspection worker outcomes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findFirst.mockResolvedValue(job);
    mocks.jobUpdate.mockResolvedValue({});
    mocks.uploadUpdate.mockResolvedValue({});
    mocks.objectUpdate.mockResolvedValue({});
    mocks.deletionUpsert.mockResolvedValue({});
    mocks.auditCreate.mockResolvedValue({});
    mocks.transaction.mockImplementation(async (operation) => {
      if (typeof operation === "function") {
        return operation({
          storageInspectionJob: { update: mocks.jobUpdate },
          uploadSession: { update: mocks.uploadUpdate },
          storageObject: { update: mocks.objectUpdate },
          storageDeletionJob: { upsert: mocks.deletionUpsert },
          storageAuditEvent: { create: mocks.auditCreate },
        });
      }
      return Promise.all(operation);
    });
  });

  it("rejects an unsafe file and removes its quarantined object", async () => {
    const privateStorage = storage();
    const result = await processStorageInspectionJob("job-1", "lease-1", {
      env,
      storage: privateStorage,
      inspect: async () => {
        throw new QuarantineInspectionError("MALWARE_DETECTED", "unsafe", "Rejected");
      },
    });
    expect(result).toEqual({ outcome: "rejected", code: "MALWARE_DETECTED" });
    expect(privateStorage.deleteIncoming).toHaveBeenCalledWith("private-incoming-key");
    expect(mocks.jobUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "REJECTED", safeErrorCode: "MALWARE_DETECTED" }),
    }));
    expect(mocks.uploadUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "REJECTED" }),
    }));
  });

  it("retries infrastructure failures without approving or deleting the PDF", async () => {
    const privateStorage = storage();
    const result = await processStorageInspectionJob("job-1", "lease-1", {
      env,
      storage: privateStorage,
      inspect: async () => {
        throw new QuarantineInspectionError("MALWARE_SCANNER_UNAVAILABLE", "operational", "Unavailable");
      },
    });
    expect(result).toEqual({ outcome: "retry", code: "MALWARE_SCANNER_UNAVAILABLE" });
    expect(privateStorage.deleteIncoming).not.toHaveBeenCalled();
    expect(mocks.jobUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: "RETRY", safeErrorCode: "MALWARE_SCANNER_UNAVAILABLE" }),
    }));
    expect(mocks.uploadUpdate).toHaveBeenCalledWith(expect.objectContaining({
      data: { safeErrorCode: "MALWARE_SCANNER_UNAVAILABLE" },
    }));
  });
});
