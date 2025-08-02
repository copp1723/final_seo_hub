-- Migration: Add orphaned_tasks table for storing webhook data from unknown dealerships
-- Description: This table stores webhook data when a dealership is not yet onboarded
-- Created: 2025-08-02

-- Create orphaned_tasks table
CREATE TABLE IF NOT EXISTS "orphaned_tasks" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "clientId" TEXT,
    "clientEmail" TEXT,
    "eventType" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "completionDate" TEXT,
    "deliverables" JSONB,
    "rawPayload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "linkedRequestId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orphaned_tasks_pkey" PRIMARY KEY ("id")
);

-- Create unique index on externalId
CREATE UNIQUE INDEX IF NOT EXISTS "orphaned_tasks_externalId_key" ON "orphaned_tasks"("externalId");

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS "orphaned_tasks_clientId_idx" ON "orphaned_tasks"("clientId");
CREATE INDEX IF NOT EXISTS "orphaned_tasks_clientEmail_idx" ON "orphaned_tasks"("clientEmail");
CREATE INDEX IF NOT EXISTS "orphaned_tasks_processed_idx" ON "orphaned_tasks"("processed");
CREATE INDEX IF NOT EXISTS "orphaned_tasks_externalId_idx" ON "orphaned_tasks"("externalId");
CREATE INDEX IF NOT EXISTS "orphaned_tasks_createdAt_idx" ON "orphaned_tasks"("createdAt");

-- Add trigger to automatically update updatedAt timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for orphaned_tasks table
DROP TRIGGER IF EXISTS update_orphaned_tasks_updated_at ON "orphaned_tasks";
CREATE TRIGGER update_orphaned_tasks_updated_at
    BEFORE UPDATE ON "orphaned_tasks"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert a comment about this migration
INSERT INTO "audit_logs" ("id", "action", "entityType", "entityId", "userEmail", "userId", "details", "resource", "createdAt")
VALUES (
    gen_random_uuid(),
    'SCHEMA_MIGRATION',
    'DATABASE',
    'orphaned_tasks_table',
    'system@seowerks.ai',
    NULL,
    '{"migration": "add_orphaned_tasks_table", "description": "Added orphaned_tasks table for storing webhook data from unknown dealerships", "tables_added": ["orphaned_tasks"], "indexes_added": ["orphaned_tasks_externalId_key", "orphaned_tasks_clientId_idx", "orphaned_tasks_clientEmail_idx", "orphaned_tasks_processed_idx", "orphaned_tasks_externalId_idx", "orphaned_tasks_createdAt_idx"], "triggers_added": ["update_orphaned_tasks_updated_at"]}',
    'orphaned_tasks',
    CURRENT_TIMESTAMP
)
ON CONFLICT DO NOTHING;