-- Phase 1: Critical Database Table Restoration
-- Restores essential authentication and business logic tables
-- Based on legacy schema analysis from onekeel_gseo and older final_seo_hub

-- ============================================
-- AUTHENTICATION TABLES (Critical Priority)
-- ============================================

-- NextAuth accounts table for OAuth provider linking
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(provider, "providerAccountId")
);

-- NextAuth sessions table for session management
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "sessionToken" TEXT NOT NULL UNIQUE,
  "userId" TEXT NOT NULL,
  expires TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

-- NextAuth verification tokens for email verification and password resets
CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires TIMESTAMP(3) NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- ============================================
-- CORE BUSINESS LOGIC TABLES (Critical Priority)
-- ============================================

-- Requests table - Core business entity for client requests
CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "agencyId" TEXT,
  "dealershipId" TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL,
  priority TEXT DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH
  status TEXT DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, COMPLETED, CANCELLED
  "packageType" TEXT, -- SILVER, GOLD, PLATINUM
  "pagesCompleted" INTEGER DEFAULT 0,
  "blogsCompleted" INTEGER DEFAULT 0,
  "gbpPostsCompleted" INTEGER DEFAULT 0,
  "improvementsCompleted" INTEGER DEFAULT 0,
  keywords JSONB,
  "targetUrl" TEXT,
  "targetCities" JSONB,
  "targetModels" JSONB,
  "completedTasks" JSONB,
  "contentUrl" TEXT,
  "pageTitle" TEXT,
  "seoworksTaskId" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY ("agencyId") REFERENCES agencies(id) ON DELETE SET NULL,
  FOREIGN KEY ("dealershipId") REFERENCES dealerships(id) ON DELETE SET NULL
);

-- Tasks table - Task management system
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "dealershipId" TEXT,
  "agencyId" TEXT,
  type TEXT NOT NULL, -- PAGE, BLOG, GBP_POST, IMPROVEMENT
  status TEXT DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, COMPLETED, CANCELLED
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH
  "targetUrl" TEXT,
  keywords JSONB,
  "requestId" TEXT, -- Link to the request this task belongs to
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY ("agencyId") REFERENCES agencies(id) ON DELETE SET NULL,
  FOREIGN KEY ("dealershipId") REFERENCES dealerships(id) ON DELETE SET NULL,
  FOREIGN KEY ("requestId") REFERENCES requests(id) ON DELETE SET NULL
);

-- Orders table - Order management and billing
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "agencyId" TEXT,
  "userEmail" TEXT NOT NULL,
  "taskType" TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  "assignedTo" TEXT,
  "estimatedHours" DECIMAL(5,2),
  "actualHours" DECIMAL(5,2),
  deliverables JSONB,
  "completionNotes" TEXT,
  "qualityScore" INTEGER,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "seoworksTaskId" TEXT,
  FOREIGN KEY ("agencyId") REFERENCES agencies(id) ON DELETE CASCADE,
  FOREIGN KEY ("userEmail") REFERENCES users(email) ON DELETE CASCADE
);

-- ============================================
-- COMMUNICATION TABLES (High Priority)
-- ============================================

-- Conversations table - Chat conversation threads
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  model TEXT DEFAULT 'gpt-4-turbo',
  "agencyId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "messageCount" INTEGER DEFAULT 0,
  "lastMessage" TEXT,
  "lastMessageAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("agencyId") REFERENCES agencies(id) ON DELETE CASCADE,
  FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

-- Messages table - Chat/conversation messages
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  content TEXT NOT NULL,
  role TEXT NOT NULL,
  model TEXT,
  "agencyId" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenCount" INTEGER,
  "responseTime" INTEGER,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("conversationId") REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- AUDIT AND COMPLIANCE TABLES (High Priority)
-- ============================================

-- Audit logs table - Audit trail and compliance
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  action TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "userEmail" TEXT NOT NULL,
  "userId" TEXT,
  details JSONB,
  resource TEXT,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("userEmail") REFERENCES users(email) ON DELETE CASCADE
);

-- ============================================
-- USER MANAGEMENT TABLES (Medium Priority)
-- ============================================

-- User invites table - User invitation system
CREATE TABLE IF NOT EXISTS user_invites (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  "isSuperAdmin" BOOLEAN DEFAULT false,
  "agencyId" TEXT,
  "invitedBy" TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'pending',
  "acceptedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("agencyId") REFERENCES agencies(id) ON DELETE CASCADE,
  FOREIGN KEY ("invitedBy") REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(email, "agencyId")
);

-- User preferences table - User personalization settings
CREATE TABLE IF NOT EXISTS user_preferences (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL UNIQUE,
  "emailNotifications" BOOLEAN DEFAULT true,
  "requestCreated" BOOLEAN DEFAULT true,
  "statusChanged" BOOLEAN DEFAULT true,
  "taskCompleted" BOOLEAN DEFAULT true,
  "weeklySummary" BOOLEAN DEFAULT true,
  "marketingEmails" BOOLEAN DEFAULT false,
  timezone TEXT DEFAULT 'America/New_York',
  language TEXT DEFAULT 'en',
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================
-- SEOWORKS INTEGRATION TABLES (Medium Priority)
-- ============================================

-- SEOWorks tasks table - SEOWorks integration
CREATE TABLE IF NOT EXISTS seoworks_tasks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "externalId" TEXT NOT NULL UNIQUE,
  "taskType" TEXT NOT NULL,
  status TEXT NOT NULL,
  "completionDate" TIMESTAMP(3),
  "postTitle" TEXT NOT NULL,
  "postUrl" TEXT,
  "completionNotes" TEXT,
  "isWeekly" BOOLEAN DEFAULT false,
  payload JSONB,
  "orderId" TEXT UNIQUE,
  "agencyId" TEXT,
  "receivedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  FOREIGN KEY ("agencyId") REFERENCES agencies(id) ON DELETE CASCADE,
  FOREIGN KEY ("orderId") REFERENCES orders(id) ON DELETE SET NULL
);

-- SEOWorks task mappings - Request to SEOWorks task mapping
CREATE TABLE IF NOT EXISTS seoworks_task_mappings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "requestId" TEXT NOT NULL,
  "seoworksTaskId" TEXT NOT NULL UNIQUE,
  "taskType" TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active',
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("requestId") REFERENCES requests(id) ON DELETE CASCADE
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Authentication indexes
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts("userId");
CREATE INDEX IF NOT EXISTS idx_accounts_provider_account ON accounts(provider, "providerAccountId");
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions("userId");
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions("sessionToken");

-- Business logic indexes
CREATE INDEX IF NOT EXISTS idx_requests_user_status ON requests("userId", status);
CREATE INDEX IF NOT EXISTS idx_requests_agency_status ON requests("agencyId", status);
CREATE INDEX IF NOT EXISTS idx_requests_status_created ON requests(status, "createdAt");
CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON tasks("userId", status);
CREATE INDEX IF NOT EXISTS idx_tasks_agency_status ON tasks("agencyId", status);
CREATE INDEX IF NOT EXISTS idx_tasks_status_created ON tasks(status, "createdAt");
CREATE INDEX IF NOT EXISTS idx_orders_agency_status ON orders("agencyId", status);
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON orders("userEmail", status);

-- Communication indexes
CREATE INDEX IF NOT EXISTS idx_conversations_agency_updated ON conversations("agencyId", "updatedAt");
CREATE INDEX IF NOT EXISTS idx_conversations_agency_user ON conversations("agencyId", "userId");
CREATE INDEX IF NOT EXISTS idx_messages_agency_conversation ON messages("agencyId", "conversationId");
CREATE INDEX IF NOT EXISTS idx_messages_agency_created ON messages("agencyId", "createdAt");

-- Audit indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs("entityType", "entityId");
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON audit_logs("userEmail", "createdAt");

-- User management indexes
CREATE INDEX IF NOT EXISTS idx_user_invites_email_status ON user_invites(email, status);
CREATE INDEX IF NOT EXISTS idx_user_invites_token ON user_invites(token);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences("userId");

-- SEOWorks indexes
CREATE INDEX IF NOT EXISTS idx_seoworks_tasks_agency_status ON seoworks_tasks("agencyId", status);
CREATE INDEX IF NOT EXISTS idx_seoworks_tasks_external_id ON seoworks_tasks("externalId");
CREATE INDEX IF NOT EXISTS idx_seoworks_tasks_type_status ON seoworks_tasks("taskType", status);
CREATE INDEX IF NOT EXISTS idx_seoworks_mappings_request ON seoworks_task_mappings("requestId");
CREATE INDEX IF NOT EXISTS idx_seoworks_mappings_task ON seoworks_task_mappings("seoworksTaskId");

-- ============================================
-- UPDATE STATEMENTS COMPLETE
-- ============================================

-- Update the updated_at timestamp for existing users table to force Prisma regeneration
UPDATE users SET "updatedAt" = CURRENT_TIMESTAMP WHERE id IS NOT NULL;

-- Log the restoration completion
DO $$
BEGIN
    RAISE NOTICE 'Phase 1 database restoration completed successfully';
    RAISE NOTICE 'Added 13 critical missing tables with proper indexes';
    RAISE NOTICE 'Authentication, business logic, and communication systems restored';
END $$;