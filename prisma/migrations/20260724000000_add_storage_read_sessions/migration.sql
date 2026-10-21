CREATE TABLE "StorageReadSession" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "projectAssetId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "absoluteExpiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    CONSTRAINT "StorageReadSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StorageReadSession_tokenHash_key"
  ON "StorageReadSession"("tokenHash");
CREATE INDEX "StorageReadSession_ownerId_status_expiresAt_idx"
  ON "StorageReadSession"("ownerId", "status", "expiresAt");
CREATE INDEX "StorageReadSession_projectAssetId_status_idx"
  ON "StorageReadSession"("projectAssetId", "status");
CREATE INDEX "StorageReadSession_absoluteExpiresAt_idx"
  ON "StorageReadSession"("absoluteExpiresAt");

ALTER TABLE "StorageReadSession"
  ADD CONSTRAINT "StorageReadSession_operation_check"
    CHECK ("operation" IN ('VIEW', 'DOWNLOAD', 'PRINT', 'SIGN')),
  ADD CONSTRAINT "StorageReadSession_status_check"
    CHECK ("status" IN ('ACTIVE', 'REVOKED', 'EXPIRED')),
  ADD CONSTRAINT "StorageReadSession_expiry_check"
    CHECK ("absoluteExpiresAt" >= "expiresAt"),
  ADD CONSTRAINT "StorageReadSession_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "StorageReadSession_projectAssetId_fkey"
    FOREIGN KEY ("projectAssetId") REFERENCES "ProjectAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
