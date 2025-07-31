# Safe Removal Plan for Duplicate Files

This document outlines a step-by-step plan for safely removing duplicate files from the codebase. The plan is organized by risk level, with high-risk files addressed first, followed by medium-risk and low-risk files.

## Prerequisites

Before beginning the removal process:

1. Ensure you have a complete backup of the codebase
   ```bash
   tar -czf "codebase-backup-$(date +%Y%m%d-%H%M%S).tar.gz" --exclude='.next' --exclude='node_modules' --exclude='.git' .
   ```

2. Make sure all tests are passing in the current state
   ```bash
   npm test
   ```

3. Have the application running locally to test after each removal
   ```bash
   npm run dev
   ```

## Removal Process

### Phase 1: High-Risk Files

#### Step 1: Remove middleware-simple 2.ts (Security Vulnerability)

1. Verify that middleware-simple.ts is the active file being used:
   ```bash
   grep -r "from.*middleware-simple" --include="*.ts" --include="*.tsx" .
   ```

2. Remove the duplicate file:
   ```bash
   rm middleware/middleware-simple\ 2.ts
   ```

3. Test authentication functionality:
   - Log in with different user roles
   - Verify protected routes are properly secured
   - Ensure no auto-login as SUPER_ADMIN occurs

#### Step 2: Remove API Route Duplicates

1. Remove route-utils 2.ts:
   ```bash
   rm lib/api/route-utils\ 2.ts
   ```

2. Remove search-console-api 2.ts:
   ```bash
   rm lib/api/search-console-api\ 2.ts
   ```

3. Test API functionality:
   - Test API endpoints that use route-utils.ts
   - Test Search Console API functionality, especially with dealership connections

### Phase 2: Medium-Risk Files

#### Step 3: Remove Service Duplicates

1. Remove dealership 2.ts:
   ```bash
   rm lib/dealership\ 2.ts
   ```

2. Remove ga4ServiceMock 2.ts:
   ```bash
   rm lib/google/ga4ServiceMock\ 2.ts
   ```

3. Test service functionality:
   - Test dealership-related features
   - Test GA4 analytics features, especially when API fails and mock data is used

#### Step 4: Remove Data File Duplicates

1. Remove prisma-errors 2.ts:
   ```bash
   rm lib/prisma-errors\ 2.ts
   ```

2. Remove prisma-server 2.ts:
   ```bash
   rm lib/prisma-server\ 2.ts
   ```

3. Remove search-console-mock 2.ts:
   ```bash
   rm lib/mock-data/search-console-mock\ 2.ts
   ```

4. Test database and mock data functionality:
   - Test database error handling
   - Test features that use mock data when APIs are unavailable

### Phase 3: Low-Risk Files

#### Step 5: Handle next.config.js

1. Merge Sentry configuration from next.config 2.js into next.config.js:
   - Add the Sentry import at the top:
     ```javascript
     const { withSentryConfig } = require('@sentry/nextjs')
     ```
   - Wrap the module.exports with withSentryConfig:
     ```javascript
     module.exports = withSentryConfig(nextConfig, {
       // For all available options, see: https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
       widenClientFileUpload: true,
       transpileClientSDK: true,
       tunnelRoute: '/api/monitoring/sentry',
       hideSourceMaps: true,
       disableLogger: true,
       autoInstrumentServerFunctions: true,
       autoInstrumentClientFunctions: true,
     });
     ```

2. Verify the merged configuration works:
   ```bash
   npm run build
   ```

3. Remove next.config 2.js:
   ```bash
   rm next.config\ 2.js
   ```

### Phase 4: Final Testing

1. Run a complete build:
   ```bash
   npm run build
   ```

2. Run all tests:
   ```bash
   npm test
   ```

3. Start the application and test all major features:
   ```bash
   npm run dev
   ```

4. Test authentication, API endpoints, dealership functionality, and analytics features

## Rollback Plan

If any issues are encountered during the removal process:

1. Restore the specific file from the backup:
   ```bash
   tar -xzf codebase-backup-YYYYMMDD-HHMMSS.tar.gz --strip-components=1 path/to/file
   ```

2. If multiple issues occur, restore the entire codebase:
   ```bash
   rm -rf ./* # Be careful with this command!
   tar -xzf codebase-backup-YYYYMMDD-HHMMSS.tar.gz --strip-components=1
   ```

3. Document any issues encountered and reassess the removal plan

## Documentation Update

After successfully removing all duplicate files:

1. Update the project documentation to reflect the changes
2. Document the security vulnerability that was removed
3. Communicate the changes to the development team

## Conclusion

Following this plan will ensure the safe removal of duplicate files while maintaining the functionality of the application. The phased approach allows for testing after each step, minimizing the risk of introducing issues.