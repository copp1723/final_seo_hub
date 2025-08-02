# DealershipId Data Flow Fix

## Critical Fix Applied: December 2024

## Problem Summary
The SEO Hub platform was not properly assigning `dealershipId` to requests when they were created, causing:
- Dashboard stats to show no data
- Analytics to fail
- Tasks to be created without proper dealership association

## Files Modified

### 1. `/app/api/requests/route.ts`
- **Added**: Fetch user with dealershipId before creating request
- **Fixed**: Include dealershipId in request creation
- **Fixed**: Use user's dealershipId for task creation
- **Added**: Better logging for tracking dealershipId flow
- **Applied**: safeDbOperation for all database calls

### 2. `/app/api/dashboard/stats/route.ts`
- **Added**: Backward compatibility to find requests without dealershipId
- **Improved**: Query to include requests by user's dealership even if request doesn't have dealershipId

## Migration Scripts Created

### 1. `fix-missing-dealership-ids.ts`
TypeScript migration script that:
- Finds and fixes requests missing dealershipId
- Finds and fixes tasks missing dealershipId
- Reports on users without dealerships
- Provides statistics on the fixes

**Run with:**
```bash
npx tsx scripts/fix-missing-dealership-ids.ts
```

### 2. `fix-missing-dealership-ids.sql`
Emergency SQL script for quick fixes:
- Updates requests with missing dealershipId
- Updates tasks with missing dealershipId
- Reports on remaining issues

**Run with:**
```bash
psql $DATABASE_URL < scripts/fix-missing-dealership-ids.sql
```

### 3. `test-dealership-data-flow.ts`
Testing script to verify the fixes:
- Checks user setup
- Validates dealership assignments
- Reviews recent requests
- Checks for orphaned tasks
- Provides recommendations

**Run with:**
```bash
npx tsx scripts/test-dealership-data-flow.ts
```

## Process Orphaned Tasks

If you have orphaned tasks from SEOWorks webhooks, process them:

```bash
# View orphaned tasks
curl -X GET https://your-domain.com/api/seoworks/process-orphaned-tasks?processed=false \
  -H "x-api-key: $SEOWORKS_WEBHOOK_SECRET"

# Process for a specific user
curl -X POST https://your-domain.com/api/seoworks/process-orphaned-tasks \
  -H "x-api-key: $SEOWORKS_WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-id-here"}'
```

## Verification Steps

1. **Run the test script** to check current state:
   ```bash
   npx tsx scripts/test-dealership-data-flow.ts
   ```

2. **Fix existing data** if needed:
   ```bash
   npx tsx scripts/fix-missing-dealership-ids.ts
   ```

3. **Process orphaned tasks** if any exist

4. **Test new request creation** to ensure dealershipId is being set

5. **Check dashboard** to verify stats are showing

## Monitoring

Add these log searches to monitor the fix:

- Search for: `"Creating focus request in database"` - Should show dealershipId
- Search for: `"Request missing dealership"` - Should decrease over time
- Search for: `"dealershipId": null` - Should only appear for system/admin users

## Success Criteria

- [ ] All new requests have dealershipId populated
- [ ] Dashboard shows accurate statistics
- [ ] Tasks are created with proper dealershipId
- [ ] Orphaned tasks are processed
- [ ] No errors in logs related to missing dealershipId
