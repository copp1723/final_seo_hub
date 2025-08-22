# Dealership Data Mixing Analysis & Architecture Report

## Executive Summary

This report provides a comprehensive analysis of the dealership data mixing issue where selecting "Acura of Columbus" in the dealership dropdown displays Jay Hatfield Motorsports data instead. Based on extensive code review, I've identified the complete data flow architecture and potential contamination sources.

## Current Architecture Overview

### Data Flow Architecture

```mermaid
graph TD
    A[Dashboard Component] --> B[Analytics API /api/dashboard/analytics]
    B --> C[Analytics Coordinator]
    C --> D[Dealership Analytics Service]
    D --> E[Dealership Data Bridge]
    E --> F{Connection Resolution Logic}
    F --> G[Database: GA4 Connections]
    F --> H[Database: Search Console Connections]
    F --> I[Property Mapping Service]
    
    J[Dealership Context] --> K[/api/dealerships/switch]
    K --> L[User.dealershipId Update]
    
    M[User Selection] --> J
    
    style A fill:#e1f5fe
    style F fill:#fff3e0
    style G fill:#fce4ec
    style H fill:#fce4ec
```

### Service Layer Architecture

1. **Frontend Layer**
   - Dashboard Component (`/app/(authenticated)/dashboard/page.tsx`)
   - Dealership Context (`/app/context/DealershipContext.tsx`)
   - Dealership Selector Component

2. **API Layer**
   - Analytics API (`/app/api/dashboard/analytics/route.ts`)
   - Dealership Switch API (`/app/api/dealerships/switch/route.ts`)
   - Search Console Status API (`/app/api/search-console/status/route.ts`)

3. **Service Layer**
   - Analytics Coordinator (`/lib/analytics/analytics-coordinator.ts`)
   - Dealership Analytics Service (`/lib/google/dealership-analytics-service.ts`)
   - Dealership Data Bridge (`/lib/services/dealership-data-bridge.ts`)

4. **Data Layer**
   - Property Mapping (`/lib/dealership-property-mapping.ts`)
   - Database Connections (GA4 & Search Console)
   - Redis Cache Layer

## Connection Resolution Logic Analysis

### Current Priority Order

The `DealershipDataBridge` resolves connections in this priority order:

**For GA4 Connections:**
1. Dealership-specific connection (`ga4_connections.dealershipId = target`)
2. Property mapping with agency token access
3. ~~Agency-level connection~~ (functional but risky)
4. User-level connection

**For Search Console Connections:**
1. Dealership-specific connection (`search_console_connections.dealershipId = target`)
2. ~~Property mapping with agency token~~ (DISABLED - line 211 in data bridge)
3. ~~Agency-level connection~~ (DISABLED - line 231 in data bridge)
4. User-level connection

### Critical Finding: Agency Fallback Logic Still Active for GA4

Lines 131-159 in `dealership-data-bridge.ts` show that **agency-level GA4 fallback is still enabled**, which can cause data mixing:

```typescript
// 3. Check for agency-level GA4 connection (ONLY as a fallback when dealership has no specific connection)
if (user.agencyId) {
  const agencyGA4 = await prisma.ga4_connections.findFirst({
    where: { 
      dealershipId: null, // Agency-level connection, not tied to specific dealership
      userId: { 
        in: await prisma.users.findMany({
          where: { agencyId: user.agencyId, role: { in: ['AGENCY_ADMIN', 'SUPER_ADMIN'] } },
          select: { id: true }
        }).then(users => users.map(u => u.id))
      }
    },
    orderBy: { updatedAt: 'desc' }
  })
```

## Identified Data Contamination Sources

### 1. **Database Connection Corruption (PRIMARY ISSUE)**
- **Status**: CONFIRMED - mentioned in handover document
- **Impact**: Critical - causes wrong data to display
- **Root Cause**: Existing corrupted Search Console connections in database
- **Evidence**: API requests send correct `dealershipId: 'dealer-acura-columbus'` but return Jay Hatfield data

### 2. **Agency-Level GA4 Fallback Logic (ACTIVE RISK)**
- **Status**: ACTIVE - code still enabled
- **Impact**: High - can cause GA4 data mixing between dealerships in same agency
- **Location**: Lines 131-159 in `dealership-data-bridge.ts`
- **Risk**: If Acura of Columbus has no direct GA4 connection, it could fall back to agency connection

### 3. **Cached Stale Data (SECONDARY ISSUE)**
- **Status**: POSSIBLE - Redis caching enabled
- **Impact**: Medium - temporary wrong data display
- **Evidence**: User reports browser showing cached/stale JavaScript
- **Location**: Analytics Coordinator with Redis caching

### 4. **Property Mapping with Wrong Tokens (MITIGATED)**
- **Status**: DISABLED for Search Console, ACTIVE for GA4
- **Impact**: Medium - wrong site URL with correct tokens
- **Mitigation**: Search Console mapping disabled at line 211

### 5. **OAuth Callback Hard-coded Defaults (FIXED)**
- **Status**: RESOLVED - mentioned as fixed in handover
- **Impact**: Was critical
- **Evidence**: Previous hard-coded Jay Hatfield defaults

## Property Mapping Analysis

From `/lib/dealership-property-mapping.ts`:

```typescript
{
  dealershipId: 'dealer-acura-columbus',
  dealershipName: 'Acura of Columbus',
  ga4PropertyId: '284944578',
  searchConsoleUrl: 'https://www.acuracolumbus.com/',
  hasAccess: true
}
```

**Key Finding**: The mapping correctly points to:
- GA4 Property: `284944578` (Acura of Columbus)
- Search Console: `https://www.acuracolumbus.com/`

However, **the Jay Hatfield URLs appearing suggest database corruption**:
- Wrong URL: `http://www.jhmofjoplin.com` (Jay Hatfield Motorsports of Joplin)
- Wrong Keywords: "jay hatfield joplin", "jay hatfield motorsports"

## Database Investigation Requirements

Since I cannot access the database directly, the following investigations are critical:

### 1. **Search Console Connections Audit**
```sql
-- Check all Search Console connections for Acura of Columbus
SELECT 
  id, 
  userId, 
  dealershipId, 
  siteUrl, 
  siteName,
  createdAt,
  updatedAt
FROM search_console_connections 
WHERE dealershipId = 'dealer-acura-columbus' 
   OR siteUrl LIKE '%acura%'
   OR siteUrl LIKE '%jhmofjoplin%'
ORDER BY updatedAt DESC;
```

### 2. **GA4 Connections Audit**
```sql
-- Check all GA4 connections for Acura of Columbus
SELECT 
  id, 
  userId, 
  dealershipId, 
  propertyId,
  createdAt,
  updatedAt
FROM ga4_connections 
WHERE dealershipId = 'dealer-acura-columbus' 
   OR propertyId = '284944578'  -- Acura property
   OR propertyId = '317578343'  -- Jay Hatfield Joplin property
ORDER BY updatedAt DESC;
```

### 3. **User-Dealership Mapping Audit**
```sql
-- Check user assignments and agency relationships
SELECT 
  u.id as userId,
  u.email,
  u.dealershipId,
  u.agencyId,
  u.role,
  d.name as dealershipName
FROM users u
LEFT JOIN dealerships d ON u.dealershipId = d.id
WHERE u.dealershipId = 'dealer-acura-columbus'
   OR u.agencyId = (SELECT agencyId FROM dealerships WHERE id = 'dealer-acura-columbus');
```

### 4. **Agency Cross-Contamination Check**
```sql
-- Find if Jay Hatfield and Acura are in same agency
SELECT 
  d.id,
  d.name,
  d.agencyId
FROM dealerships d
WHERE d.id IN ('dealer-acura-columbus', 'dealer-jhm-joplin')
   OR d.name LIKE '%acura%'
   OR d.name LIKE '%jay hatfield%';
```

## Caching Investigation

### Redis Cache Keys Analysis
The system uses Redis caching with keys like:
- `analytics:{userId}:{dateRange}:{dealershipId}`
- `dashboard:{userId}:{dateRange}:{dealershipId}`

**Potential Issues:**
1. Cache keys might not include dealership ID correctly
2. Cache invalidation might not work properly on dealership switch
3. Stale cache from previous dealership selection

### Cache Investigation Steps
1. Check Redis for keys containing both Acura and Jay Hatfield data
2. Verify cache invalidation triggers on dealership switch
3. Test with force refresh (`clearCache=true`)

## Technical Debt & Architecture Issues

### 1. **Complex Connection Resolution Logic**
- Multiple fallback layers create confusion
- Agency-level fallbacks introduce cross-contamination risk
- Priority order not clearly documented

### 2. **Inconsistent Disabled States**
- Search Console agency fallback disabled
- GA4 agency fallback still enabled
- Property mapping partially disabled

### 3. **Database Schema Issues**
- No foreign key constraints preventing invalid connections
- No unique constraints on dealership-service combinations
- Allows multiple connections per dealership-service pair

### 4. **Insufficient Access Control**
- Agency users can access connections from other dealerships
- No audit trail for connection changes
- No validation of property access permissions

## Recommended Investigation Steps (Priority Order)

### **IMMEDIATE (Critical Path)**

1. **Database Connection Audit**
   ```bash
   # Run the SQL queries above to identify corrupted connections
   # Focus on Search Console connections for dealer-acura-columbus
   ```

2. **Check Current User's Connection Resolution**
   ```bash
   # Add debug logging to DealershipDataBridge.resolveDealershipConnections()
   # Log which connection is being selected and why
   ```

3. **Redis Cache Investigation**
   ```bash
   # Check Redis for contaminated cache entries
   redis-cli KEYS "*dealer-acura-columbus*"
   redis-cli KEYS "*analytics*acura*"
   redis-cli KEYS "*jhmofjoplin*"
   ```

### **HIGH PRIORITY (Architecture Fixes)**

4. **Disable GA4 Agency Fallback Temporarily**
   ```typescript
   // In dealership-data-bridge.ts line 131, wrap in if (false)
   if (false && user.agencyId) {
     // Agency-level GA4 connection logic
   }
   ```

5. **Add Connection Validation**
   ```typescript
   // Add validation in DealershipAnalyticsService
   // Verify propertyId matches expected mapping
   // Log when unexpected data source is used
   ```

6. **Implement Strict Access Control**
   ```typescript
   // Validate that resolved connection matches dealership
   // Prevent cross-dealership data access
   ```

### **MEDIUM PRIORITY (Data Integrity)**

7. **Database Cleanup Script**
   - Remove corrupted connections
   - Ensure one-to-one dealership-to-connection mapping
   - Add data validation constraints

8. **Cache Invalidation Improvement**
   - Ensure dealership switch clears all related cache
   - Add cache keys for debugging
   - Implement cache versioning

### **LOW PRIORITY (Monitoring)**

9. **Add Comprehensive Logging**
   - Log all connection resolution decisions
   - Track data source for each API response
   - Add alerts for unexpected data mixing

10. **Implement Connection Health Monitoring**
    - Regular validation of connection integrity
    - Automated detection of data mixing
    - Dashboard for connection status

## Root Cause Hypothesis

Based on the architecture analysis, the most likely root cause is:

**Database corruption in `search_console_connections` table** where:
1. Acura of Columbus dealership has a connection record
2. BUT the `siteUrl` field contains Jay Hatfield URL (`jhmofjoplin.com`)
3. This causes the correct dealership selection to fetch wrong website data

**Supporting Evidence:**
- API requests show correct `dealershipId: 'dealer-acura-columbus'`
- Property mapping shows correct URLs for Acura
- Agency fallback for Search Console is disabled
- The specific Jay Hatfield Joplin URL suggests exact connection record corruption

## Next Steps for Resolution

### **Phase 1: Immediate Triage (1-2 hours)**
1. Run database audit queries
2. Check Redis cache for contaminated entries
3. Add debug logging to connection resolution
4. Temporarily disable GA4 agency fallback

### **Phase 2: Data Cleanup (2-4 hours)**
1. Identify and fix corrupted database connections
2. Clear contaminated cache entries
3. Validate all Acura connections point to correct properties
4. Test dealership switching with clean data

### **Phase 3: Architecture Hardening (4-8 hours)**
1. Implement strict access validation
2. Add database constraints
3. Improve cache invalidation
4. Add comprehensive monitoring

## Summary

The dealership data mixing issue is a multi-layered problem with the primary root cause being **database connection corruption**. The architecture has several fallback mechanisms that, while designed for resilience, create opportunities for data contamination. The immediate fix requires database audit and cleanup, followed by architecture hardening to prevent future occurrences.

The codebase shows evidence of previous attempts to fix this issue (disabled agency fallbacks for Search Console), but GA4 still has active fallback logic that could cause similar issues. A comprehensive approach addressing both data integrity and architecture improvements is recommended.