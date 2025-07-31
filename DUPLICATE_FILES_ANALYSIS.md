# Duplicate Files Analysis

This document provides a comprehensive analysis of duplicate files found in the codebase. Files with " 2" suffix were analyzed to determine which version is active/correct and to create a plan for safely removing the duplicates.

## High-Risk Files

### Authentication Files

#### middleware-simple.ts vs middleware-simple 2.ts

- **Status**: Different content
- **Active File**: middleware-simple.ts
- **Analysis**: middleware-simple 2.ts contains a serious security vulnerability - it auto-logs in as SUPER_ADMIN. This is a high-risk issue that needs immediate attention.
- **Recommendation**: Remove middleware-simple 2.ts as it contains a security vulnerability.

### API Files

#### route-utils.ts vs route-utils 2.ts

- **Status**: Identical content
- **Active File**: route-utils.ts
- **Analysis**: Both files have identical content. No imports of route-utils 2.ts were found in the codebase.
- **Recommendation**: Remove route-utils 2.ts as it's an unused duplicate.

#### search-console-api.ts vs search-console-api 2.ts

- **Status**: Different content
- **Active File**: search-console-api.ts
- **Analysis**: search-console-api.ts has been updated with dealership-specific functionality. The newer version supports dealership-specific connections.
- **Recommendation**: Remove search-console-api 2.ts as it's an older version without the dealership functionality.

## Medium-Risk Files

### Service Files

#### dealership.ts vs dealership 2.ts

- **Status**: Identical content
- **Active File**: dealership.ts
- **Analysis**: Both files have identical content. No imports of dealership 2.ts were found in the codebase.
- **Recommendation**: Remove dealership 2.ts as it's an unused duplicate.

#### ga4ServiceMock.ts vs ga4ServiceMock 2.ts

- **Status**: Identical content
- **Active File**: ga4ServiceMock.ts
- **Analysis**: Both files have identical content. No imports of ga4ServiceMock 2.ts were found in the codebase.
- **Recommendation**: Remove ga4ServiceMock 2.ts as it's an unused duplicate.

### Data Files

#### prisma-errors.ts vs prisma-errors 2.ts

- **Status**: Identical content
- **Active File**: Neither file appears to be actively used
- **Analysis**: Both files have identical content. No direct imports or references to either file were found in the codebase.
- **Recommendation**: Remove prisma-errors 2.ts as it's a duplicate. Consider also removing prisma-errors.ts if it's confirmed to be unused.

#### prisma-server.ts vs prisma-server 2.ts

- **Status**: Identical content
- **Active File**: Neither file appears to be actively used
- **Analysis**: Both files have identical content. No direct imports or references to either file were found in the codebase.
- **Recommendation**: Remove prisma-server 2.ts as it's a duplicate. Consider also removing prisma-server.ts if it's confirmed to be unused.

#### search-console-mock.ts vs search-console-mock 2.ts

- **Status**: Identical content
- **Active File**: search-console-mock.ts
- **Analysis**: Both files have identical content. The ga4ServiceMock.ts file imports functions from search-console-mock.ts.
- **Recommendation**: Remove search-console-mock 2.ts as it's an unused duplicate.

## Low-Risk Files

### Configuration Files

#### next.config.js vs next.config 2.js

- **Status**: Different content
- **Active File**: next.config.js
- **Analysis**: next.config 2.js includes Sentry configuration that is not present in next.config.js. This suggests that next.config 2.js might be a newer version with additional monitoring capabilities.
- **Recommendation**: Carefully merge the Sentry configuration from next.config 2.js into next.config.js before removing next.config 2.js.

## Summary

- **Total Duplicate Files**: 8
- **Identical Files**: 6 (route-utils, dealership, ga4ServiceMock, prisma-errors, prisma-server, search-console-mock)
- **Different Files**: 2 (middleware-simple, next.config)
- **Security Issues**: 1 (middleware-simple 2.ts contains a security vulnerability)

## Next Steps

1. Create a safe removal plan in SAFE_REMOVAL_PLAN.md
2. Remove duplicates in order of risk level (high → medium → low)
3. Test after each removal to ensure functionality
4. Update documentation to reflect changes