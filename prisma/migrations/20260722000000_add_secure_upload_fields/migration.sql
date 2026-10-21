ALTER TABLE "UploadSession"
  ADD COLUMN "idempotencyKey" TEXT NOT NULL,
  ADD COLUMN "mode" TEXT NOT NULL,
  ADD COLUMN "partSize" INTEGER,
  ADD COLUMN "partCount" INTEGER,
  ADD COLUMN "safeErrorCode" TEXT,
  ADD COLUMN "cancelledAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "UploadSession_ownerId_idempotencyKey_key"
  ON "UploadSession"("ownerId", "idempotencyKey");

ALTER TABLE "UploadSession"
  ADD CONSTRAINT "UploadSession_partSize_check"
    CHECK ("partSize" IS NULL OR "partSize" >= 5242880),
  ADD CONSTRAINT "UploadSession_partCount_check"
    CHECK ("partCount" IS NULL OR ("partCount" >= 1 AND "partCount" <= 10000)),
  ADD CONSTRAINT "UploadSession_mode_check"
    CHECK ("mode" IN ('SINGLE', 'MULTIPART'));
