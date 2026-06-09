-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "CollectionRun" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "environmentId" TEXT,
    "status" "RunStatus" NOT NULL DEFAULT 'QUEUED',
    "iterations" INTEGER NOT NULL DEFAULT 1,
    "totalRequests" INTEGER NOT NULL DEFAULT 0,
    "passed" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "report" JSONB NOT NULL DEFAULT '[]',
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CollectionRun_collectionId_idx" ON "CollectionRun"("collectionId");

-- CreateIndex
CREATE INDEX "CollectionRun_workspaceId_idx" ON "CollectionRun"("workspaceId");
