-- Production Schema Sync
-- Ensures production database matches Prisma schema after recovery

-- Add email column to ga4_connections if not exists
ALTER TABLE ga4_connections ADD COLUMN IF NOT EXISTS email TEXT;

-- Add email column to search_console_connections if not exists  
ALTER TABLE search_console_connections ADD COLUMN IF NOT EXISTS email TEXT;

-- Ensure analytics_cache table exists for performance
CREATE TABLE IF NOT EXISTS analytics_cache (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  cache_key TEXT NOT NULL UNIQUE,
  data JSONB NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for analytics cache
CREATE INDEX IF NOT EXISTS idx_analytics_cache_key ON analytics_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_expires ON analytics_cache(expires_at);

-- Add critical performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ga4_connections_user_id ON ga4_connections("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_console_connections_user_id ON search_console_connections("userId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dealerships_agency_id ON dealerships("agencyId");

-- Verify schema is correct
SELECT 'ga4_connections email column' as check_name, 
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.columns 
         WHERE table_name = 'ga4_connections' AND column_name = 'email'
       ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 'search_console_connections email column' as check_name,
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.columns 
         WHERE table_name = 'search_console_connections' AND column_name = 'email'
       ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL  
SELECT 'analytics_cache table' as check_name,
       CASE WHEN EXISTS (
         SELECT 1 FROM information_schema.tables 
         WHERE table_name = 'analytics_cache'
       ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;