-- Emergency fix: Create essential tables for SEOWorks integration
-- Based on Prisma schema definitions

-- Create required enums first
CREATE TYPE "RequestPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'FAILED');
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE "TaskType" AS ENUM ('PAGE', 'BLOG', 'GBP_POST', 'IMPROVEMENT');
CREATE TYPE "PackageType" AS ENUM ('SILVER', 'GOLD', 'PLATINUM');

-- Create requests table
CREATE TABLE "requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agencyId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "priority" "RequestPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "packageType" "PackageType",
    "pagesCompleted" INTEGER NOT NULL DEFAULT 0,
    "blogsCompleted" INTEGER NOT NULL DEFAULT 0,
    "gbpPostsCompleted" INTEGER NOT NULL DEFAULT 0,
    "improvementsCompleted" INTEGER NOT NULL DEFAULT 0,
    "keywords" JSONB,
    "targetUrl" TEXT,
    "targetCities" JSONB,
    "targetModels" JSONB,
    "completedTasks" JSONB,
    "contentUrl" TEXT,
    "pageTitle" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dealershipId" TEXT,
    "seoworksTaskId" TEXT,

    CONSTRAINT "requests_pkey" PRIMARY KEY ("id")
);

-- Create tasks table  
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "TaskType" NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "userId" TEXT NOT NULL,
    "requestId" TEXT,
    "dealershipId" TEXT,
    "agencyId" TEXT,
    "dueDate" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "keywords" JSONB,
    "targetUrl" TEXT,
    "targetCities" JSONB,
    "targetModels" JSONB,
    "completedUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- Create orphaned_tasks table
CREATE TABLE "orphaned_tasks" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientEmail" TEXT,
    "taskType" TEXT NOT NULL,
    "taskData" JSONB NOT NULL,
    "webhookPayload" JSONB NOT NULL,
    "processingAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastProcessingError" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orphaned_tasks_pkey" PRIMARY KEY ("id")
);

-- Create indexes for performance
CREATE INDEX "requests_userId_idx" ON "requests"("userId");
CREATE INDEX "requests_dealershipId_idx" ON "requests"("dealershipId");
CREATE INDEX "requests_status_idx" ON "requests"("status");
CREATE INDEX "requests_createdAt_idx" ON "requests"("createdAt" DESC);
CREATE INDEX "requests_seoworksTaskId_idx" ON "requests"("seoworksTaskId");

CREATE INDEX "tasks_userId_idx" ON "tasks"("userId");
CREATE INDEX "tasks_requestId_idx" ON "tasks"("requestId");
CREATE INDEX "tasks_dealershipId_idx" ON "tasks"("dealershipId");
CREATE INDEX "tasks_status_idx" ON "tasks"("status");
CREATE INDEX "tasks_createdAt_idx" ON "tasks"("createdAt" DESC);

CREATE INDEX "orphaned_tasks_clientId_idx" ON "orphaned_tasks"("clientId");
CREATE INDEX "orphaned_tasks_externalId_idx" ON "orphaned_tasks"("externalId");
CREATE INDEX "orphaned_tasks_createdAt_idx" ON "orphaned_tasks"("createdAt" DESC);

-- Verify tables were created
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename ~ '(request|task|orphan)' ORDER BY tablename;