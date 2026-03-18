-- CreateTable
CREATE TABLE "AppRuntimeGuard" (
    "id" TEXT NOT NULL,
    "appName" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "databaseLabel" TEXT,
    "requireUsers" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppRuntimeGuard_pkey" PRIMARY KEY ("id")
);
