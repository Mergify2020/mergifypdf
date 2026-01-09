-- Replace stored URLs with object keys only.
ALTER TABLE "Project"
  DROP COLUMN IF EXISTS "pdfUrl",
  DROP COLUMN IF EXISTS "previewUrl",
  ADD COLUMN "pdfKey" TEXT,
  ADD COLUMN "previewKey" TEXT;
