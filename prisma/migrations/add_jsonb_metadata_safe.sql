-- Safe migration to add JSONB metadata fields
-- These additions won't affect any existing functionality

-- Add metadata to Agency table for flexible configuration
ALTER TABLE "Agency" 
ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}';

-- Add AI preferences to User table
ALTER TABLE "User" 
ADD COLUMN IF NOT EXISTS "ai_preferences" JSONB DEFAULT '{}';

-- Add extended data to Request table
ALTER TABLE "Request" 
ADD COLUMN IF NOT EXISTS "extended_data" JSONB DEFAULT '{}';

-- Create GA4 Report Cache table (completely new, won't affect existing)
CREATE TABLE IF NOT EXISTS "GA4ReportCache" (
  "id" TEXT NOT NULL,
  "agency_id" TEXT NOT NULL,
  "report_type" TEXT NOT NULL,
  "date_range" TEXT NOT NULL,
  "dimensions" JSONB DEFAULT '[]',
  "metrics" JSONB DEFAULT '[]',
  "filters" JSONB DEFAULT '{}',
  "report_data" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "hit_count" INTEGER NOT NULL DEFAULT 0,
  
  CONSTRAINT "GA4ReportCache_pkey" PRIMARY KEY ("id")
);

-- Create index for cache lookups
CREATE INDEX IF NOT EXISTS "GA4ReportCache_lookup_idx" 
ON "GA4ReportCache"("agency_id", "report_type", "date_range", "expires_at");

-- Create Communication Channels table for future use
CREATE TABLE IF NOT EXISTS "CommunicationChannel" (
  "id" TEXT NOT NULL,
  "agency_id" TEXT NOT NULL,
  "channel_type" TEXT NOT NULL, -- 'email', 'sms', 'webchat'
  "provider" TEXT NOT NULL, -- 'mailgun', 'twilio', 'sendgrid', etc.
  "configuration" JSONB NOT NULL DEFAULT '{}',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  
  CONSTRAINT "CommunicationChannel_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraint
ALTER TABLE "CommunicationChannel" 
ADD CONSTRAINT "CommunicationChannel_agency_id_fkey" 
FOREIGN KEY ("agency_id") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add index for channel lookups
CREATE INDEX IF NOT EXISTS "CommunicationChannel_agency_type_idx" 
ON "CommunicationChannel"("agency_id", "channel_type", "is_active");

-- Add comment to explain the purpose
COMMENT ON COLUMN "Agency"."metadata" IS 'Flexible JSON storage for agency-specific settings';
COMMENT ON COLUMN "User"."ai_preferences" IS 'User AI chat preferences and settings';
COMMENT ON COLUMN "Request"."extended_data" IS 'Additional request data that may vary by type';
COMMENT ON TABLE "GA4ReportCache" IS 'Cache for expensive GA4 API calls';
COMMENT ON TABLE "CommunicationChannel" IS 'Multi-channel communication configuration';