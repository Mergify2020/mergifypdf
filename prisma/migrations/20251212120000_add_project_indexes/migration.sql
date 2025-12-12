-- Add composite indexes to speed up dashboard and projects listing queries.
CREATE INDEX IF NOT EXISTS "Project_userId_updatedAt_idx"
ON "Project" ("userId", "updatedAt" DESC);

CREATE INDEX IF NOT EXISTS "Project_userId_createdAt_idx"
ON "Project" ("userId", "createdAt" DESC);

