-- Migration: Add Multi-Dealership Access System
-- Description: Adds support for users to have access to multiple dealerships
-- Author: Claude Code
-- Date: 2025-08-18

-- Create the access level enum
CREATE TYPE "UserDealershipAccessLevel" AS ENUM ('READ', 'WRITE', 'ADMIN');

-- Add currentDealershipId to users table for session context
ALTER TABLE users ADD COLUMN "currentDealershipId" TEXT;

-- Create index for currentDealershipId
CREATE INDEX "users_currentDealershipId_idx" ON users("currentDealershipId");

-- Add foreign key constraint for currentDealershipId
ALTER TABLE users ADD CONSTRAINT "users_currentDealershipId_fkey" 
  FOREIGN KEY ("currentDealershipId") REFERENCES dealerships(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- Create the user_dealership_access junction table
CREATE TABLE user_dealership_access (
  id TEXT NOT NULL DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "dealershipId" TEXT NOT NULL,
  "accessLevel" "UserDealershipAccessLevel" NOT NULL DEFAULT 'READ',
  "grantedBy" TEXT,
  "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "user_dealership_access_pkey" PRIMARY KEY (id)
);

-- Create unique constraint to prevent duplicate user-dealership combinations
ALTER TABLE user_dealership_access ADD CONSTRAINT "user_dealership_access_userId_dealershipId_key" 
  UNIQUE ("userId", "dealershipId");

-- Create indexes for performance
CREATE INDEX "user_dealership_access_userId_idx" ON user_dealership_access("userId");
CREATE INDEX "user_dealership_access_dealershipId_idx" ON user_dealership_access("dealershipId");
CREATE INDEX "user_dealership_access_isActive_idx" ON user_dealership_access("isActive");

-- Add foreign key constraints
ALTER TABLE user_dealership_access ADD CONSTRAINT "user_dealership_access_userId_fkey" 
  FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE user_dealership_access ADD CONSTRAINT "user_dealership_access_dealershipId_fkey" 
  FOREIGN KEY ("dealershipId") REFERENCES dealerships(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE user_dealership_access ADD CONSTRAINT "user_dealership_access_grantedBy_fkey" 
  FOREIGN KEY ("grantedBy") REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- Create function to automatically update updatedAt
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic updatedAt updates
CREATE TRIGGER update_user_dealership_access_updated_at 
  BEFORE UPDATE ON user_dealership_access 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Migration to populate existing single-dealership relationships into the new system
-- This ensures backward compatibility for existing users
INSERT INTO user_dealership_access ("userId", "dealershipId", "accessLevel", "grantedAt", "isActive")
SELECT 
  id as "userId",
  "dealershipId",
  'ADMIN' as "accessLevel",  -- Existing users get admin access to their dealership
  "createdAt" as "grantedAt",
  true as "isActive"
FROM users 
WHERE "dealershipId" IS NOT NULL
ON CONFLICT ("userId", "dealershipId") DO NOTHING;

-- Set currentDealershipId to existing dealershipId for backward compatibility
UPDATE users 
SET "currentDealershipId" = "dealershipId" 
WHERE "dealershipId" IS NOT NULL AND "currentDealershipId" IS NULL;

-- Add helpful comments
COMMENT ON TABLE user_dealership_access IS 'Junction table allowing users to have access to multiple dealerships with different permission levels';
COMMENT ON COLUMN user_dealership_access."accessLevel" IS 'Permission level: READ (view only), WRITE (edit content), ADMIN (full control)';
COMMENT ON COLUMN user_dealership_access."grantedBy" IS 'SUPER_ADMIN user who granted this access';
COMMENT ON COLUMN user_dealership_access."expiresAt" IS 'Optional expiration date for temporary access';
COMMENT ON COLUMN users."currentDealershipId" IS 'Active dealership context for multi-dealership users';

-- Migration complete
-- Note: The existing dealershipId column in users table is kept for backward compatibility
-- New functionality will use the user_dealership_access table and currentDealershipId