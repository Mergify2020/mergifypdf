-- Add trashedAt column for soft delete state
ALTER TABLE "Project" ADD COLUMN "trashedAt" TIMESTAMP(3);

-- Backfill trashedAt from legacy data.trashed flag
UPDATE "Project"
SET "trashedAt" = NOW()
WHERE "data" ->> 'trashed' = 'true' AND "trashedAt" IS NULL;

-- Remove legacy trashed flag from JSON payload
UPDATE "Project"
SET "data" = ("data" - 'trashed')
WHERE "data" ? 'trashed';
