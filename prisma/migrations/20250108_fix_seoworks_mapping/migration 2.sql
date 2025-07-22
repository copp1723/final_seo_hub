-- CreateTable (if not exists)
CREATE TABLE IF NOT EXISTS "SEOWorksTaskMapping" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "seoworksTaskId" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SEOWorksTaskMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'SEOWorksTaskMapping_seoworksTaskId_key') THEN
        CREATE UNIQUE INDEX "SEOWorksTaskMapping_seoworksTaskId_key" ON "SEOWorksTaskMapping"("seoworksTaskId");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'SEOWorksTaskMapping_requestId_idx') THEN
        CREATE INDEX "SEOWorksTaskMapping_requestId_idx" ON "SEOWorksTaskMapping"("requestId");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'SEOWorksTaskMapping_seoworksTaskId_idx') THEN
        CREATE INDEX "SEOWorksTaskMapping_seoworksTaskId_idx" ON "SEOWorksTaskMapping"("seoworksTaskId");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'SEOWorksTaskMapping_status_idx') THEN
        CREATE INDEX "SEOWorksTaskMapping_status_idx" ON "SEOWorksTaskMapping"("status");
    END IF;
END $$;

-- AddForeignKey (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'SEOWorksTaskMapping_requestId_fkey'
    ) THEN
        ALTER TABLE "SEOWorksTaskMapping" ADD CONSTRAINT "SEOWorksTaskMapping_requestId_fkey" 
        FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
