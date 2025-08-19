# Legacy Repository Schema Analysis
## Database Recovery Completeness Assessment

**Analysis Date:** 2025-08-19  
**Current Database Tables:** 16  
**Legacy Schema Tables:** 29  
**Missing Tables:** 13

---

## 🚨 CRITICAL MISSING TABLES

### **Current Database Has:**
- agencies ✅
- ai_agent_config ✅ (New/Enhanced)
- analytics_cache ✅ (Recently Added)
- clients ✅ (New/Enhanced)
- conversation_messages ✅ (New/Enhanced)
- dealerships ✅
- ga4_connections ✅
- kb_audit_log ✅ (New/Enhanced)
- kb_document_chunks ✅ (New/Enhanced)
- kb_documents ✅ (New/Enhanced)
- knowledge_bases ✅ (New/Enhanced)
- leads ✅ (New/Enhanced)
- persona_kb_access ✅ (New/Enhanced)
- personas ✅ (New/Enhanced)
- search_console_connections ✅
- users ✅

### **MISSING FROM CURRENT DATABASE:**

#### **🔴 CRITICAL BUSINESS TABLES (High Priority)**
1. **`accounts`** - NextAuth OAuth account linking
2. **`sessions`** - User session management
3. **`verification_tokens`** - Email verification & password resets
4. **`requests`** - Core business entity for client requests
5. **`tasks`** - Task management system
6. **`orders`** - Order management and billing
7. **`seoworks_tasks`** - SEOWorks integration
8. **`messages`** - Chat/conversation messages
9. **`conversations`** - Chat conversation threads

#### **🟡 IMPORTANT FEATURE TABLES (Medium Priority)**
10. **`audit_logs`** - Audit trail and compliance
11. **`user_invites`** - User invitation system
12. **`monthly_usage`** - Usage tracking and billing
13. **`usage_metrics`** - Performance analytics

#### **🟢 ENHANCED FEATURE TABLES (Low Priority)**
14. **`escalations`** - Support escalation system
15. **`report_schedules`** - Automated reporting
16. **`themes`** - UI customization
17. **`user_preferences`** - User settings
18. **`system_settings`** - Global configuration
19. **`feature_flag_overrides`** - Feature flagging
20. **`dealership_onboardings`** - Onboarding workflows
21. **`user_ga4_tokens`** - GA4 token management
22. **`user_search_console_tokens`** - Search Console tokens
23. **`seoworks_task_mappings`** - SEOWorks mapping

---

## 📊 IMPACT ANALYSIS

### **🚨 BROKEN FUNCTIONALITY (Critical)**

#### **Authentication System - PARTIALLY BROKEN**
- ❌ **OAuth Accounts:** No `accounts` table for provider linking
- ❌ **Session Management:** No `sessions` table for NextAuth
- ❌ **Email Verification:** No `verification_tokens` table
- ✅ **Basic Auth:** User table exists but missing account linking

#### **Core Business Logic - SEVERELY BROKEN**
- ❌ **Request Management:** No `requests` table (CORE BUSINESS ENTITY)
- ❌ **Task System:** No `tasks` table for work management
- ❌ **Order Processing:** No `orders` table for billing
- ❌ **SEOWorks Integration:** No `seoworks_tasks` table

#### **Communication System - BROKEN**
- ❌ **Chat Functionality:** No `messages` or `conversations` tables
- ❌ **User Invitations:** No `user_invites` table

#### **Analytics & Reporting - PARTIALLY BROKEN**
- ❌ **Usage Tracking:** No `usage_metrics` or `monthly_usage` tables
- ❌ **Audit Trail:** No `audit_logs` table
- ✅ **GA4/Search Console:** Connection tables exist

### **🟡 DEGRADED FUNCTIONALITY (Important)**

#### **User Experience**
- ❌ **User Preferences:** No personalization settings
- ❌ **Theme Customization:** No themes table
- ❌ **Feature Flags:** No A/B testing capabilities

#### **Administrative Features**
- ❌ **System Configuration:** No global settings
- ❌ **Automated Reports:** No scheduling system
- ❌ **Support Escalation:** No escalation workflows

---

## 🔍 LEGACY API ENDPOINT ANALYSIS

### **Missing API Routes (Based on Legacy Schema)**

#### **Core Business APIs**
- `/api/requests/*` - Request management CRUD
- `/api/tasks/*` - Task management system
- `/api/orders/*` - Order processing and billing
- `/api/seoworks/*` - SEOWorks integration webhooks

#### **Authentication APIs**
- `/api/auth/accounts/*` - OAuth account linking
- `/api/auth/verify-email` - Email verification
- `/api/auth/reset-password` - Password reset flow

#### **Communication APIs**
- `/api/conversations/*` - Chat conversation management
- `/api/messages/*` - Message CRUD operations
- `/api/invites/*` - User invitation system

#### **Analytics & Reporting APIs**
- `/api/usage/*` - Usage metrics and tracking
- `/api/reports/*` - Report generation and scheduling
- `/api/audit/*` - Audit log access

---

## 🏗️ RESTORATION PRIORITY MATRIX

### **🔴 PHASE 1: CRITICAL BUSINESS RESTORATION (Week 1)**

#### **1. Authentication System Restoration**
```sql
CREATE TABLE accounts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  userId TEXT NOT NULL,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  providerAccountId TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(provider, providerAccountId)
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  sessionToken TEXT NOT NULL UNIQUE,
  userId TEXT NOT NULL,
  expires TIMESTAMP NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires TIMESTAMP NOT NULL,
  PRIMARY KEY (identifier, token)
);
```

#### **2. Core Business Logic Restoration**
```sql
CREATE TABLE requests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  agencyId TEXT NOT NULL,
  dealershipId TEXT,
  userId TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium',
  dueDate TIMESTAMP,
  completedAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (agencyId) REFERENCES agencies(id) ON DELETE CASCADE,
  FOREIGN KEY (dealershipId) REFERENCES dealerships(id) ON DELETE SET NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  agencyId TEXT NOT NULL,
  dealershipId TEXT,
  requestId TEXT,
  userId TEXT,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  title TEXT NOT NULL,
  description TEXT,
  completedAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (agencyId) REFERENCES agencies(id) ON DELETE CASCADE,
  FOREIGN KEY (dealershipId) REFERENCES dealerships(id) ON DELETE SET NULL,
  FOREIGN KEY (requestId) REFERENCES requests(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
);
```

### **🟡 PHASE 2: FEATURE RESTORATION (Week 2-3)**

#### **Communication System**
- Restore `conversations` and `messages` tables
- Implement chat API endpoints
- Add real-time messaging capabilities

#### **User Management Enhancement**
- Add `user_invites` table
- Implement invitation workflow
- Add `user_preferences` for personalization

#### **Audit & Compliance**
- Restore `audit_logs` table
- Add audit logging to all critical operations
- Implement compliance reporting

### **🟢 PHASE 3: ADVANCED FEATURES (Month 2)**

#### **Analytics & Reporting**
- Add `usage_metrics` and `monthly_usage` tables
- Implement automated reporting with `report_schedules`
- Add performance dashboards

#### **Administrative Features**
- Add `system_settings` for global configuration
- Implement `feature_flag_overrides` for A/B testing
- Add `themes` for UI customization

---

## 🔧 IMMEDIATE ACTION ITEMS

### **1. Create Missing Tables Script**
```bash
#!/bin/bash
# restore-critical-tables.sql
psql $DATABASE_URL -f scripts/restore-phase1-tables.sql
```

### **2. Data Migration Strategy**
- Check for any existing data that needs to be preserved
- Plan migration from old system if applicable
- Create seed data for development and testing

### **3. API Restoration**
- Audit existing API routes against legacy functionality
- Identify and restore missing endpoints
- Update frontend components to use restored APIs

### **4. Testing Strategy**
- Create integration tests for restored functionality
- Verify business workflows end-to-end
- Test authentication flows with new tables

---

## 🎯 SUCCESS CRITERIA

### **Phase 1 Complete When:**
- ✅ NextAuth fully functional with OAuth providers
- ✅ Request management system operational
- ✅ Task management system functional
- ✅ User sessions properly managed

### **Phase 2 Complete When:**
- ✅ Chat/messaging system restored
- ✅ User invitation system working
- ✅ Audit logging operational
- ✅ Usage tracking functional

### **Phase 3 Complete When:**
- ✅ Automated reporting system active
- ✅ Feature flagging operational
- ✅ Theme customization available
- ✅ Full administrative capabilities restored

---

## ⚠️ RISKS & CONSIDERATIONS

### **Data Loss Risk**
- Some business data may be permanently lost
- Historical analytics and usage data missing
- Previous conversations and messages gone

### **Integration Complexity**
- SEOWorks integration may need reconfiguration
- OAuth flows will need testing with new tables
- Existing users may need to re-authenticate

### **Business Continuity**
- Core request management is currently broken
- Task assignment and tracking non-functional
- Billing and order management missing

---

## 📋 NEXT STEPS

1. **Immediate (Today):** Create and run Phase 1 table restoration scripts
2. **Week 1:** Implement core business logic APIs
3. **Week 2:** Restore authentication and session management
4. **Week 3:** Add communication and user management features
5. **Month 1:** Complete analytics and administrative features

**This analysis reveals that while the database infrastructure exists, critical business functionality is missing and needs immediate restoration to make the system fully operational.**