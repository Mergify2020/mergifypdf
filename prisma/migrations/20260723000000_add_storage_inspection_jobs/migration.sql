CREATE TABLE "StorageInspectionJob" (
    "id" TEXT NOT NULL,
    "uploadSessionId" TEXT NOT NULL,
    "storageObjectId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseToken" TEXT,
    "leaseExpiresAt" TIMESTAMP(3),
    "safeErrorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "StorageInspectionJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StorageInspectionJob_uploadSessionId_key"
  ON "StorageInspectionJob"("uploadSessionId");
CREATE UNIQUE INDEX "StorageInspectionJob_storageObjectId_key"
  ON "StorageInspectionJob"("storageObjectId");
CREATE INDEX "StorageInspectionJob_status_nextAttemptAt_idx"
  ON "StorageInspectionJob"("status", "nextAttemptAt");
CREATE INDEX "StorageInspectionJob_leaseExpiresAt_idx"
  ON "StorageInspectionJob"("leaseExpiresAt");

ALTER TABLE "StorageInspectionJob"
  ADD CONSTRAINT "StorageInspectionJob_attempts_check"
    CHECK ("attempts" >= 0 AND "attempts" <= "maxAttempts"),
  ADD CONSTRAINT "StorageInspectionJob_maxAttempts_check"
    CHECK ("maxAttempts" BETWEEN 1 AND 20),
  ADD CONSTRAINT "StorageInspectionJob_status_check"
    CHECK ("status" IN ('PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED', 'RETRY', 'FAILED')),
  ADD CONSTRAINT "StorageInspectionJob_uploadSessionId_fkey"
    FOREIGN KEY ("uploadSessionId") REFERENCES "UploadSession"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "StorageInspectionJob_storageObjectId_fkey"
    FOREIGN KEY ("storageObjectId") REFERENCES "StorageObject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
