-- Add SEOWorks task ID mapping to Request table
ALTER TABLE "Request" ADD COLUMN "seoworksTaskId" TEXT;

-- Add index for efficient lookups
CREATE INDEX "Request_seoworksTaskId_idx" ON "Request"("seoworksTaskId");

-- Add SEOWorks task mapping table for better tracking
CREATE TABLE "SEOWorksTaskMapping" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "seoworksTaskId" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SEOWorksTaskMapping_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraint
ALTER TABLE "SEOWorksTaskMapping" ADD CONSTRAINT "SEOWorksTaskMapping_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add unique constraint to prevent duplicate mappings
ALTER TABLE "SEOWorksTaskMapping" ADD CONSTRAINT "SEOWorksTaskMapping_seoworksTaskId_key" UNIQUE ("seoworksTaskId");

-- Add indexes for efficient lookups
CREATE INDEX "SEOWorksTaskMapping_requestId_idx" ON "SEOWorksTaskMapping"("requestId");
CREATE INDEX "SEOWorksTaskMapping_seoworksTaskId_idx" ON "SEOWorksTaskMapping"("seoworksTaskId");
CREATE INDEX "SEOWorksTaskMapping_status_idx" ON "SEOWorksTaskMapping"("status");