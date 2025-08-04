-- Create orphaned_tasks table for storing webhooks from unknown dealerships
CREATE TABLE IF NOT EXISTS "orphaned_tasks" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "clientEmail" TEXT,
    "taskType" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "completionDate" TIMESTAMP(3),
    "deliverables" JSONB DEFAULT '[]',
    "webhookData" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orphaned_tasks_pkey" PRIMARY KEY ("id")
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS "orphaned_tasks_clientId_idx" ON "orphaned_tasks"("clientId");
CREATE INDEX IF NOT EXISTS "orphaned_tasks_clientEmail_idx" ON "orphaned_tasks"("clientEmail");
CREATE INDEX IF NOT EXISTS "orphaned_tasks_processed_idx" ON "orphaned_tasks"("processed");
CREATE INDEX IF NOT EXISTS "orphaned_tasks_externalId_idx" ON "orphaned_tasks"("externalId");

-- Add the orphaned_tasks entry to _prisma_migrations if it doesn't exist
INSERT INTO "_prisma_migrations" (
    "id",
    "checksum",
    "finished_at",
    "migration_name",
    "logs",
    "rolled_back_at",
    "started_at",
    "applied_steps_count"
) VALUES (
    'add_orphaned_tasks_' || extract(epoch from now())::text,
    md5('add_orphaned_tasks_table'),
    NOW(),
    '20250202_add_orphaned_tasks_table',
    NULL,
    NULL,
    NOW(),
    1
) ON CONFLICT DO NOTHING;