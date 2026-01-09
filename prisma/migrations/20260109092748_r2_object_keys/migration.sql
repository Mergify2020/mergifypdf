-- DropIndex
DROP INDEX "public"."Project_userId_createdAt_idx";

-- DropIndex
DROP INDEX "public"."Project_userId_updatedAt_idx";

-- CreateIndex
CREATE INDEX "Project_userId_updatedAt_idx" ON "Project"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "Project_userId_createdAt_idx" ON "Project"("userId", "createdAt");
