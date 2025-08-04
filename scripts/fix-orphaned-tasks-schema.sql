-- Fix orphaned_tasks table to match schema.prisma
-- Add missing columns and adjust existing ones

-- Add eventType column if it doesn't exist
ALTER TABLE orphaned_tasks 
ADD COLUMN IF NOT EXISTS "eventType" TEXT;

-- Rename webhookData to rawPayload to match schema
ALTER TABLE orphaned_tasks 
RENAME COLUMN "webhookData" TO "rawPayload";

-- Add missing columns
ALTER TABLE orphaned_tasks 
ADD COLUMN IF NOT EXISTS "linkedRequestId" TEXT,
ADD COLUMN IF NOT EXISTS "notes" TEXT;

-- Make externalId unique
ALTER TABLE orphaned_tasks 
ADD CONSTRAINT "orphaned_tasks_externalId_key" UNIQUE ("externalId");

-- Update eventType for existing records (if any)
UPDATE orphaned_tasks 
SET "eventType" = 'task.completed' 
WHERE "eventType" IS NULL;

-- Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'orphaned_tasks'
ORDER BY ordinal_position;