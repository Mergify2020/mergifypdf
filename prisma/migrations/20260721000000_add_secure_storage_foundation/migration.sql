ALTER TABLE "User" ADD COLUMN "storageNamespace" TEXT;

CREATE TABLE "StorageObject" (
    "id" TEXT NOT NULL, "ownerId" TEXT NOT NULL, "environment" TEXT NOT NULL,
    "bucketClass" TEXT NOT NULL, "objectKey" TEXT NOT NULL, "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPLOADING', "contentType" TEXT, "byteLength" BIGINT,
    "sha256" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL, "readyAt" TIMESTAMP(3), "expiresAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3), CONSTRAINT "StorageObject_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ProjectAsset" (
    "id" TEXT NOT NULL, "projectId" TEXT NOT NULL, "storageObjectId" TEXT NOT NULL,
    "role" TEXT NOT NULL, "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "deletedAt" TIMESTAMP(3),
    CONSTRAINT "ProjectAsset_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "UploadSession" (
    "id" TEXT NOT NULL, "ownerId" TEXT NOT NULL, "projectId" TEXT NOT NULL,
    "storageObjectId" TEXT NOT NULL, "expectedBytes" BIGINT NOT NULL,
    "expectedSha256" TEXT NOT NULL, "contentType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING', "multipartUploadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3), CONSTRAINT "UploadSession_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "StorageDeletionJob" (
    "id" TEXT NOT NULL, "storageObjectId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING', "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "lastErrorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL, "completedAt" TIMESTAMP(3),
    CONSTRAINT "StorageDeletionJob_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ExportJob" (
    "id" TEXT NOT NULL, "ownerId" TEXT NOT NULL, "projectId" TEXT NOT NULL,
    "inputRevision" INTEGER NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING',
    "progress" INTEGER NOT NULL DEFAULT 0, "attempts" INTEGER NOT NULL DEFAULT 0,
    "outputObjectId" TEXT, "safeErrorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL, "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3), "expiresAt" TIMESTAMP(3),
    CONSTRAINT "ExportJob_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "StorageAuditEvent" (
    "id" TEXT NOT NULL, "actorId" TEXT, "projectId" TEXT, "assetId" TEXT,
    "action" TEXT NOT NULL, "outcome" TEXT NOT NULL, "safeCode" TEXT, "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StorageAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_storageNamespace_key" ON "User"("storageNamespace");
CREATE UNIQUE INDEX "StorageObject_objectKey_key" ON "StorageObject"("objectKey");
CREATE INDEX "StorageObject_ownerId_status_idx" ON "StorageObject"("ownerId", "status");
CREATE INDEX "StorageObject_environment_bucketClass_status_idx" ON "StorageObject"("environment", "bucketClass", "status");
CREATE INDEX "StorageObject_expiresAt_idx" ON "StorageObject"("expiresAt");
CREATE UNIQUE INDEX "ProjectAsset_projectId_storageObjectId_role_key" ON "ProjectAsset"("projectId", "storageObjectId", "role");
CREATE UNIQUE INDEX "ProjectAsset_projectId_role_revision_key" ON "ProjectAsset"("projectId", "role", "revision");
CREATE INDEX "ProjectAsset_projectId_role_deletedAt_idx" ON "ProjectAsset"("projectId", "role", "deletedAt");
CREATE INDEX "ProjectAsset_storageObjectId_deletedAt_idx" ON "ProjectAsset"("storageObjectId", "deletedAt");
CREATE UNIQUE INDEX "UploadSession_storageObjectId_key" ON "UploadSession"("storageObjectId");
CREATE INDEX "UploadSession_ownerId_status_idx" ON "UploadSession"("ownerId", "status");
CREATE INDEX "UploadSession_projectId_status_idx" ON "UploadSession"("projectId", "status");
CREATE INDEX "UploadSession_expiresAt_idx" ON "UploadSession"("expiresAt");
CREATE UNIQUE INDEX "StorageDeletionJob_storageObjectId_key" ON "StorageDeletionJob"("storageObjectId");
CREATE INDEX "StorageDeletionJob_status_nextAttemptAt_idx" ON "StorageDeletionJob"("status", "nextAttemptAt");
CREATE INDEX "ExportJob_ownerId_status_idx" ON "ExportJob"("ownerId", "status");
CREATE INDEX "ExportJob_projectId_createdAt_idx" ON "ExportJob"("projectId", "createdAt");
CREATE INDEX "ExportJob_status_createdAt_idx" ON "ExportJob"("status", "createdAt");
CREATE INDEX "ExportJob_expiresAt_idx" ON "ExportJob"("expiresAt");
CREATE INDEX "StorageAuditEvent_actorId_createdAt_idx" ON "StorageAuditEvent"("actorId", "createdAt");
CREATE INDEX "StorageAuditEvent_projectId_createdAt_idx" ON "StorageAuditEvent"("projectId", "createdAt");
CREATE INDEX "StorageAuditEvent_assetId_createdAt_idx" ON "StorageAuditEvent"("assetId", "createdAt");
CREATE INDEX "StorageAuditEvent_action_outcome_createdAt_idx" ON "StorageAuditEvent"("action", "outcome", "createdAt");

ALTER TABLE "StorageObject" ADD CONSTRAINT "StorageObject_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProjectAsset" ADD CONSTRAINT "ProjectAsset_revision_check" CHECK ("revision" >= 1);
ALTER TABLE "UploadSession" ADD CONSTRAINT "UploadSession_expectedBytes_check" CHECK ("expectedBytes" > 0);
ALTER TABLE "ExportJob" ADD CONSTRAINT "ExportJob_progress_check" CHECK ("progress" >= 0 AND "progress" <= 100);
ALTER TABLE "ProjectAsset" ADD CONSTRAINT "ProjectAsset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectAsset" ADD CONSTRAINT "ProjectAsset_storageObjectId_fkey" FOREIGN KEY ("storageObjectId") REFERENCES "StorageObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UploadSession" ADD CONSTRAINT "UploadSession_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UploadSession" ADD CONSTRAINT "UploadSession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UploadSession" ADD CONSTRAINT "UploadSession_storageObjectId_fkey" FOREIGN KEY ("storageObjectId") REFERENCES "StorageObject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StorageDeletionJob" ADD CONSTRAINT "StorageDeletionJob_storageObjectId_fkey" FOREIGN KEY ("storageObjectId") REFERENCES "StorageObject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExportJob" ADD CONSTRAINT "ExportJob_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExportJob" ADD CONSTRAINT "ExportJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExportJob" ADD CONSTRAINT "ExportJob_outputObjectId_fkey" FOREIGN KEY ("outputObjectId") REFERENCES "StorageObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
