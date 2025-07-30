# Agent 1: Database Query Fixes Report

## Overview
This report documents all database query fixes where queries were missing dealershipId filters. The fixes ensure proper multi-tenancy support by including dealershipId in all relevant queries.

## Files Fixed

### 1. app/api/search-console/status/route.ts
**Issue:** Line 14 - Missing dealershipId filter in search_console_connections query

**Original Code:**
```typescript
const connection = await prisma.search_console_connections.findFirst({
  where: { userId: session.user.id }
})
```

**Fixed Code:**
```typescript
const connection = await prisma.search_console_connections.findFirst({
  where: { 
    userId: session.user.id,
    dealershipId: session.user.dealershipId 
  }
})
```

**Change Explanation:** Added dealershipId filter to ensure the query respects the compound unique constraint [userId, dealershipId] on the search_console_connections table.

### 2. lib/cache.ts
**Issue:** Lines 145 and 165 - getSearchConsoleStatus and getGA4Status functions only filtered by userId

**Original Code (getSearchConsoleStatus):**
```typescript
getSearchConsoleStatus: createCachedFunction(
  async (userId: string) => {
    const { prisma } = await import('./prisma')
    return prisma.search_console_connections.findFirst({
      where: { userId },
      select: {
        id: true,
        siteUrl: true,
        siteName: true
      }
    })
  },
  // ...
)
```

**Fixed Code (getSearchConsoleStatus):**
```typescript
getSearchConsoleStatus: createCachedFunction(
  async (userId: string, dealershipId: string | null) => {
    const { prisma } = await import('./prisma')
    return prisma.search_console_connections.findFirst({
      where: { 
        userId,
        dealershipId 
      },
      select: {
        id: true,
        siteUrl: true,
        siteName: true
      }
    })
  },
  // ...
)
```

**Original Code (getGA4Status):**
```typescript
getGA4Status: createCachedFunction(
  async (userId: string) => {
    const { prisma } = await import('./prisma')
    return prisma.ga4_connections.findFirst({
      where: { userId },
      select: {
        id: true,
        propertyId: true,
        propertyName: true
      }
    })
  },
  // ...
)
```

**Fixed Code (getGA4Status):**
```typescript
getGA4Status: createCachedFunction(
  async (userId: string, dealershipId: string | null) => {
    const { prisma } = await import('./prisma')
    return prisma.ga4_connections.findFirst({
      where: { 
        userId,
        dealershipId 
      },
      select: {
        id: true,
        propertyId: true,
        propertyName: true
      }
    })
  },
  // ...
)
```

**Change Explanation:** Updated both functions to accept dealershipId as a parameter and include it in the query filter.

### 3. lib/api/search-console-api.ts
**Issue:** Line 22 - getConnection() method missing dealershipId parameter

**Changes Made:**
1. **getConnection method:**
   - Added optional dealershipId parameter
   - Updated query to include dealershipId in filter
   
2. **deleteConnection method:**
   - Added optional dealershipId parameter
   - Updated query to include dealershipId in filter
   
3. **getService method:**
   - Added optional dealershipId parameter
   - Updated internal getConnection call to pass dealershipId
   
4. **listSites method:**
   - Added optional dealershipId parameter
   - Updated internal getConnection call to pass dealershipId

**Fixed Code Example (getConnection):**
```typescript
static async getConnection(userId: string, dealershipId?: string | null): Promise<SearchConsoleConnection | null> {
  return await prisma.search_console_connections.findFirst({
    where: { 
      userId,
      dealershipId: dealershipId === undefined ? undefined : dealershipId
    }
  })
}
```

**Change Explanation:** All methods now properly support dealershipId parameter to ensure queries respect multi-tenancy.

### 4. app/api/ga4/set-property/route.ts
**Issue:** Line 76 - Bug where userId: targetDealershipId (incorrect field assignment)

**Original Code:**
```typescript
await prisma.ga4_connections.update({
  where: { userId: targetDealershipId },
  data: {
    propertyId,
    propertyName: propertyName || `Property ${propertyId}`,
    updatedAt: new Date()
  }
})
```

**Fixed Code:**
```typescript
await prisma.ga4_connections.update({
  where: { id: connection.id },
  data: {
    propertyId,
    propertyName: propertyName || `Property ${propertyId}`,
    updatedAt: new Date()
  }
})
```

**Change Explanation:** Fixed the bug where targetDealershipId was incorrectly used as userId. Now properly uses the connection.id for the update operation.

### 5. app/api/search-console/disconnect/route.ts
**Issue:** Line 28 - Bug where userId: user.dealershipId (incorrect field assignment)

**Original Code:**
```typescript
await prisma.search_console_connections.delete({
  where: { userId: user.dealershipId }
})
```

**Fixed Code:**
```typescript
const connection = await prisma.search_console_connections.findFirst({
  where: { 
    userId: session.user.id,
    dealershipId: user.dealershipId 
  }
})

if (connection) {
  await prisma.search_console_connections.delete({
    where: { id: connection.id }
  })
}
```

**Change Explanation:** Fixed the bug where dealershipId was incorrectly used as userId. Now properly finds the connection using both userId and dealershipId, then deletes by id.

## Database Schema Context
Both `search_console_connections` and `ga4_connections` tables have:
- userId field
- dealershipId field (nullable)
- Compound unique constraint: @@unique([userId, dealershipId])

This means queries must include both fields to properly identify unique records in a multi-tenant environment.

## Potential Issues Discovered

1. **Caller Updates Required:** Any code calling the updated cached functions (getSearchConsoleStatus, getGA4Status) will need to be updated to pass the dealershipId parameter.

2. **Null dealershipId Handling:** The code properly handles null dealershipId values, which is important for users not associated with a specific dealership.

3. **Backward Compatibility:** The SearchConsoleAPI methods use optional parameters, maintaining backward compatibility where dealershipId might not be provided.

## Recommendations for Agent 2

1. **Update All Callers:** Search for all calls to:
   - `cachedQueries.getSearchConsoleStatus`
   - `cachedQueries.getGA4Status`
   - `SearchConsoleAPI.getConnection`
   - `SearchConsoleAPI.deleteConnection`
   - `SearchConsoleAPI.getService`
   - `SearchConsoleAPI.listSites`
   
   Ensure they pass the dealershipId parameter from the session or appropriate context.

2. **Session Consistency:** Verify that all session objects consistently include dealershipId when needed.

3. **Error Handling:** Consider adding specific error messages when dealershipId is required but not provided.

4. **Testing:** Focus testing on:
   - Multi-tenant scenarios with different dealerships
   - Null dealershipId cases (users without dealership assignment)
   - Connection creation, updates, and deletion flows

5. **Additional Queries:** Review other database queries that might need similar fixes, particularly:
   - Any findFirst/findUnique queries on tables with compound keys
   - Queries in API routes that handle multi-tenant data

## Summary
All 5 identified database query issues have been fixed. The changes ensure proper multi-tenancy support by including dealershipId in queries where needed and fixing bugs where fields were incorrectly assigned. The fixes maintain backward compatibility while properly supporting the compound unique constraints in the database schema.