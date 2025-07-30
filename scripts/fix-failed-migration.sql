-- Script to fix failed migration in production database
-- This will mark the failed migration as resolved

-- First, let's check what migrations are in the database
SELECT * FROM "_prisma_migrations" ORDER BY started_at DESC;

-- Mark the failed migration as finished (if it exists)
UPDATE "_prisma_migrations" 
SET 
    finished_at = NOW(),
    migration_name = migration_name
WHERE 
    migration_name = '20250710_add_invitation_tokens' 
    AND finished_at IS NULL;

-- If the migration doesn't exist or you want to remove it entirely:
-- DELETE FROM "_prisma_migrations" WHERE migration_name = '20250710_add_invitation_tokens';

-- Reset the migration history to a clean state (use with caution)
-- This will remove all migration history but keep your schema intact
-- TRUNCATE TABLE "_prisma_migrations";