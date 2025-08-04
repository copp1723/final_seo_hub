# Production Database Migration Fix

## Issue
Production is experiencing errors due to missing database schema changes for SEOWorks integration:
```
The column `Request.seoworksTaskId` does not exist in the current database.
```

## Root Cause
The SEOWorks integration migration (`20250103_add_seoworks_mapping`) was not applied to the production database, causing the application to fail when trying to access the new columns.

## Immediate Fix Required

### Option 1: Automatic Deployment (Recommended)
The migration should be applied automatically on the next deployment since `build:production` includes `prisma migrate deploy`.

**To trigger a new deployment:**
1. Push any small change to trigger redeployment
2. The build process will automatically run the migration

### Option 2: Manual Migration Script
If immediate fix is needed, run the deployment script:

```bash
# On production server with DATABASE_URL set
node scripts/deploy-seoworks-migration.js
```

### Option 3: Direct SQL Execution
If scripts don't work, manually execute the migration SQL:

```sql
-- Add SEOWorks task ID mapping to Request table
ALTER TABLE "Request" ADD COLUMN "seoworksTaskId" TEXT;

-- Add index for efficient lookups
CREATE INDEX "Request_seoworksTaskId_idx" ON "Request"("seoworksTaskId");

-- Add SEOWorks task mapping table for better tracking
CREATE TABLE "SEOWorksTaskMapping" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "seoworksTaskId" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SEOWorksTaskMapping_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraint
ALTER TABLE "SEOWorksTaskMapping" ADD CONSTRAINT "SEOWorksTaskMapping_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add unique constraint to prevent duplicate mappings
ALTER TABLE "SEOWorksTaskMapping" ADD CONSTRAINT "SEOWorksTaskMapping_seoworksTaskId_key" UNIQUE ("seoworksTaskId");

-- Add indexes for efficient lookups
CREATE INDEX "SEOWorksTaskMapping_requestId_idx" ON "SEOWorksTaskMapping"("requestId");
CREATE INDEX "SEOWorksTaskMapping_seoworksTaskId_idx" ON "SEOWorksTaskMapping"("seoworksTaskId");
CREATE INDEX "SEOWorksTaskMapping_status_idx" ON "SEOWorksTaskMapping"("status");
```

## What This Migration Adds

1. **`seoworksTaskId` column** to Request table for direct task ID mapping
2. **`SEOWorksTaskMapping` table** for complex request-to-task relationships
3. **Indexes** for efficient lookups and performance
4. **Foreign key constraints** for data integrity

## Verification

After applying the migration, verify it worked:

1. Check that production errors stop appearing in logs
2. Test the webhook endpoints:
   - `POST /api/seoworks/webhook` (production)
   - `POST /api/seoworks/webhook-test` (testing)
3. Verify the mapping API works:
   - `POST /api/seoworks/mapping`
   - `GET /api/seoworks/mapping`

## Related Files

- Migration: `prisma/migrations/20250103_add_seoworks_mapping/migration.sql`
- Schema: `prisma/schema.prisma` (lines 194, 424-446)
- Webhook: `app/api/seoworks/webhook/route.ts`
- Mapping API: `app/api/seoworks/mapping/route.ts`
- Test Webhook: `app/api/seoworks/webhook-test/route.ts`

## Prevention

This issue occurred because the migration wasn't deployed with the code changes. In the future:

1. Always run `npm run build:production` which includes migration deployment
2. Verify database schema matches code expectations before deployment
3. Test critical paths after deployment

## Status

- [x] Migration created
- [x] Schema updated
- [x] Deployment script created
- [ ] **PENDING: Migration needs to be applied to production**
- [ ] **PENDING: Verify production is working**