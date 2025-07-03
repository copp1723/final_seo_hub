# SEOWorks Integration - Complete Implementation

## 🎯 Overview
This document provides a complete implementation of the SEOWorks webhook integration, addressing the core issue of mapping SEOWorks task IDs to our internal request IDs.

## ✅ What's Been Implemented

### 1. Database Schema Updates
- **Migration Created**: [`prisma/migrations/20250103_add_seoworks_mapping/migration.sql`](../prisma/migrations/20250103_add_seoworks_mapping/migration.sql)
- **Schema Updated**: [`prisma/schema.prisma`](../prisma/schema.prisma)

#### New Fields Added:
- `Request.seoworksTaskId` - Direct mapping field for SEOWorks task IDs
- `SEOWorksTaskMapping` table - Comprehensive mapping system for complex scenarios

### 2. Enhanced Webhook Endpoint
- **File**: [`app/api/seoworks/webhook/route.ts`](../app/api/seoworks/webhook/route.ts)
- **Improvements**:
  - Three-tier lookup strategy for finding requests
  - Enhanced error logging with client identification
  - Improved response format with detailed information

#### Lookup Strategy:
1. **Direct ID Match**: Try our internal request ID first
2. **SEOWorks Task ID**: Look up by `seoworksTaskId` field
3. **Mapping Table**: Use `SEOWorksTaskMapping` for complex mappings

### 3. New Task Mapping API
- **File**: [`app/api/seoworks/mapping/route.ts`](../app/api/seoworks/mapping/route.ts)
- **Purpose**: Create and manage request-to-task mappings
- **Methods**: POST (create), GET (retrieve)

### 4. Middleware Updates
- **File**: [`middleware.ts`](../middleware.ts)
- **Change**: Added `/api/seoworks/mapping` to public routes

### 5. Comprehensive Documentation
- **API Docs**: [`app/api/seoworks/README.md`](../app/api/seoworks/README.md)
- **Integration Guide**: This document

### 6. Testing Utilities
- **Helper Script**: [`scripts/seoworks-integration-helper.js`](../scripts/seoworks-integration-helper.js)
- **Features**: Connectivity testing, mapping creation, webhook simulation

## 🔧 How to Deploy

### 1. Run Database Migration
```bash
npx prisma migrate deploy
```

### 2. Generate Prisma Client
```bash
npx prisma generate
```

### 3. Verify Environment Variables
Ensure these are set in production:
```env
SEOWORKS_WEBHOOK_SECRET=7f3e9b5d2a8c4f6e1b9d3c7a5e8f2b4d6c9a1e3f7b5d9c2a6e4f8b1d3c7a9e5f
SEOWORKS_WEBHOOK_URL=<Jeff's webhook URL for onboarding data>
SEOWORKS_API_KEY=<API key for sending to Jeff's system>
```

### 4. Test the Integration
```bash
# Test connectivity
node scripts/seoworks-integration-helper.js test-connectivity

# Run full test suite
node scripts/seoworks-integration-helper.js full-test
```

## 🚀 Solving the Core Problem

### The Issue
Jeff was getting "Request not found" warnings because he was sending SEOWorks task IDs (like `task-p-70906`) as `externalId`, but our system expected our internal request IDs.

### The Solution
We now support **multiple ID formats** through a three-tier lookup system:

1. **Existing Flow**: If Jeff sends our request ID, it works as before
2. **Direct Mapping**: If a request has `seoworksTaskId` set, we can find it
3. **Mapping Table**: For complex scenarios, use the mapping API

### Implementation Options

#### Option A: Direct Field Mapping (Recommended for Simple Cases)
```sql
-- Update existing request with SEOWorks task ID
UPDATE "Request" 
SET "seoworksTaskId" = 'task-p-70906' 
WHERE "id" = 'clx123abc456';
```

#### Option B: Mapping Table (Recommended for Complex Cases)
```bash
# Create mapping via API
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-api-key: 7f3e9b5d2a8c4f6e1b9d3c7a5e8f2b4d6c9a1e3f7b5d9c2a6e4f8b1d3c7a9e5f" \
  -d '{
    "requestId": "clx123abc456",
    "seoworksTaskId": "task-p-70906",
    "taskType": "page"
  }' \
  https://rylie-seo-hub.onrender.com/api/seoworks/mapping
```

## 📋 Next Steps for Production

### 1. Create Test Mapping
To test with Jeff's current webhook:
```bash
# Find an existing request ID in your database
# Create mapping for Jeff's test task
node scripts/seoworks-integration-helper.js create-mapping <your-request-id> task-p-70906
```

### 2. Coordinate with Jeff
- Share the new mapping API documentation
- Decide on the preferred mapping strategy
- Test with a real request/task pair

### 3. Handle Multiple Locations
For businesses like "Jay Hatfield Chevrolet" with multiple locations:
- Each location gets unique `clientId`: 
  - `user_jayhatfieldchevy_pittsburg_2024`
  - `user_jayhatfieldchevy_vinita_2024`
- This is already implemented in the onboarding flow

## 🔍 Monitoring and Debugging

### Log Monitoring
Watch for these log entries:
```
[PRODUCTION WARNING] Request not found for webhook
```

When you see these:
1. Note the `externalId` and `clientId`
2. Create a mapping using the mapping API
3. The next webhook with that ID will work

### Testing Commands
```bash
# Test connectivity
node scripts/seoworks-integration-helper.js test-connectivity

# Create mapping
node scripts/seoworks-integration-helper.js create-mapping <requestId> <seoworksTaskId>

# Send test webhook
node scripts/seoworks-integration-helper.js send-webhook <externalId>

# Query existing mapping
node scripts/seoworks-integration-helper.js query-mapping <seoworksTaskId>
```

## 📊 API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/seoworks/webhook` | GET | Connectivity test |
| `/api/seoworks/webhook` | POST | Process task completion webhooks |
| `/api/seoworks/mapping` | POST | Create request-to-task mapping |
| `/api/seoworks/mapping` | GET | Retrieve existing mapping |

## 🔐 Security
- All endpoints require `x-api-key` header authentication
- API key: `7f3e9b5d2a8c4f6e1b9d3c7a5e8f2b4d6c9a1e3f7b5d9c2a6e4f8b1d3c7a9e5f`
- Timing-safe comparison prevents timing attacks
- All endpoints are in middleware public routes list

## 📞 Support
- **Jeff Leisegang** - SEOWorks CTO
- **Josh Copp** - 913.526.5281

## ✨ Key Benefits of This Implementation

1. **Backward Compatible**: Existing webhooks with our request IDs still work
2. **Flexible Mapping**: Supports both direct field mapping and complex mapping table
3. **Enhanced Logging**: Better debugging with client identification
4. **Comprehensive Testing**: Helper script for easy testing and debugging
5. **Future-Proof**: Mapping table can handle complex scenarios as they arise

The integration is now **production-ready** and addresses the core ID mapping issue while maintaining flexibility for future requirements.

## 📝 Recent Updates Based on Jeff's Feedback

### Target Cities Format Requirement
Jeff requested that the Target Cities field in the onboarding form should ask for "City, State code" format (e.g., "Denver, CO") because some dealerships are near state lines and may target cities in different states.

**Changes Made:**
- Updated onboarding form placeholders and help text
- Updated new request form with proper format guidance
- Updated API documentation examples
- Added format notes to integration documentation

**Files Updated:**
- [`components/onboarding/target-information-step.tsx`](../components/onboarding/target-information-step.tsx)
- [`components/onboarding/target-information-step 2.tsx`](../components/onboarding/target-information-step%202.tsx)
- [`app/(authenticated)/requests/new/page.tsx`](../app/(authenticated)/requests/new/page.tsx)
- [`app/api/seoworks/README.md`](../app/api/seoworks/README.md)

**Example Format:**
- **Before:** "Pittsburg;Joplin;Parsons"
- **After:** "Pittsburg, KS;Joplin, MO;Parsons, KS"

This ensures SEOWorks receives properly formatted geographic data for accurate targeting across state boundaries.