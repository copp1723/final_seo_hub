# Multi-Property GA4 Analytics Scoping Document

## Executive Summary

This document outlines the comprehensive implementation plan for extending SEO Hub's current single-property GA4 analytics to support multiple properties per agency, enabling effective management of multiple dealership locations with individual GA4 properties while maintaining agency-level aggregation and reporting capabilities.

## Current State Analysis

### Existing Infrastructure Strengths

✅ **Multi-Tenant Architecture**
- Robust Agency → User relationship model
- Role-based access control (USER, ADMIN, AGENCY_ADMIN, SUPER_ADMIN)
- Existing agency management infrastructure
- Admin interfaces for managing agencies and users

✅ **Working GA4 Integration**
- Functional GA4Service with batch reporting capabilities
- Token management and refresh system
- Error handling and debugging endpoints
- Unified analytics dashboard with tabbed interface

✅ **Database Foundation**
- PostgreSQL with Prisma ORM
- Indexed relationships and proper foreign keys
- Request/Task tracking system
- User preferences and settings management

### Current Limitations

❌ **Single Property per User**
```prisma
model GA4Connection {
  userId String @unique  // 1:1 relationship constraint
  propertyId String?     // Single property limitation
  propertyName String?
}
```

❌ **No Property Management**
- No interface for managing multiple properties
- No property assignment to dealerships/users
- No property switching in analytics dashboard

❌ **Limited Aggregation**
- Cannot combine data from multiple properties
- No agency-wide analytics across dealerships
- No comparative analysis between properties

## Target Architecture: Multi-Property Support

### Core Requirements

1. **Multiple Properties per Agency**: Each agency can manage multiple GA4 properties (one per dealership location)
2. **Property Assignment**: Admin ability to assign specific properties to specific users/dealerships
3. **Unified Analytics**: Agency-level dashboards showing aggregated data across all properties
4. **Property Switching**: Users can switch between properties they have access to
5. **Permission Control**: Role-based access to specific properties within an agency
6. **Backward Compatibility**: Existing single-property setups continue working

### Database Schema Changes

#### New Models Required

```prisma
// New model for managing multiple GA4 properties per agency
model GA4Property {
  id            String   @id @default(cuid())
  agencyId      String
  agency        Agency   @relation(fields: [agencyId], references: [id], onDelete: Cascade)
  
  // GA4 Property Information
  propertyId    String   @unique  // GA4 property ID
  propertyName  String
  propertyUrl   String?
  
  // Assignment and Access Control
  assignedUsers User[]   @relation("UserGA4Properties")
  isActive      Boolean  @default(true)
  
  // Connection Details (shared across users who access this property)
  connectionId  String   
  connection    GA4SharedConnection @relation(fields: [connectionId], references: [id])
  
  // Dealership/Location Info
  dealershipName String?
  location       String?
  targetModels   Json?    // Array of vehicle models
  targetCities   Json?    // Array of target cities
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([agencyId])
  @@index([propertyId])
}

// Shared GA4 connection for agency (instead of per-user)
model GA4SharedConnection {
  id           String   @id @default(cuid())
  agencyId     String
  agency       Agency   @relation(fields: [agencyId], references: [id], onDelete: Cascade)
  
  // OAuth tokens (encrypted)
  accessToken  String   @db.Text
  refreshToken String?  @db.Text
  expiresAt    DateTime?
  
  // Connection metadata
  connectedBy  String   // User ID who set up the connection
  connectedAt  DateTime @default(now())
  
  // Associated properties
  properties   GA4Property[]
  
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  @@index([agencyId])
}

// Many-to-many relationship for user property access
model UserGA4PropertyAccess {
  id         String      @id @default(cuid())
  userId     String
  user       User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  propertyId String
  property   GA4Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)
  
  // Access control
  accessLevel String     @default("READ") // READ, WRITE, ADMIN
  assignedAt  DateTime   @default(now())
  assignedBy  String     // User ID who granted access
  
  @@unique([userId, propertyId])
  @@index([userId])
  @@index([propertyId])
}
```

#### Agency Model Updates

```prisma
model Agency {
  // ... existing fields ...
  
  // New GA4 relationships
  ga4Connection  GA4SharedConnection?
  ga4Properties  GA4Property[]
  
  // Agency-level GA4 settings
  ga4Settings    Json @default("{}")  // { defaultProperty, aggregationEnabled, etc. }
}
```

#### User Model Updates

```prisma
model User {
  // ... existing fields ...
  
  // Replace single GA4 connection with property access
  // ga4Connection GA4Connection? // REMOVE
  ga4PropertyAccess UserGA4PropertyAccess[]
  
  // User's default property preference
  defaultGA4PropertyId String?
}
```

### API Layer Changes

#### New Endpoints Required

```typescript
// Property Management (AGENCY_ADMIN+ only)
POST   /api/ga4/properties                    // Create new property
GET    /api/ga4/properties                    // List agency properties
PUT    /api/ga4/properties/[propertyId]       // Update property
DELETE /api/ga4/properties/[propertyId]       // Delete property

// Property Assignment (AGENCY_ADMIN+ only)
POST   /api/ga4/properties/[propertyId]/users // Assign users to property
DELETE /api/ga4/properties/[propertyId]/users/[userId] // Remove user access

// Multi-Property Analytics
POST   /api/ga4/analytics/multi-property      // Aggregated analytics across properties
POST   /api/ga4/analytics/property/[propertyId] // Single property analytics
GET    /api/ga4/analytics/compare             // Compare multiple properties

// Property Discovery and Setup
GET    /api/ga4/discover-properties           // List all GA4 properties from connected account
POST   /api/ga4/setup-agency-connection       // Agency-level GA4 OAuth setup
```

#### Updated Endpoints

```typescript
// Update existing analytics to support property selection
POST /api/ga4/analytics {
  propertyId?: string,      // Optional: specific property
  aggregated?: boolean,     // Optional: aggregate across user's properties
  compareProperties?: string[] // Optional: compare specific properties
}

// Update status to show multi-property info
GET /api/ga4/status // Returns: { properties: [], defaultProperty: "", canAggregate: boolean }
```

### UI/UX Changes Required

#### 1. Property Management Interface (Admin)

**Location**: `/settings/ga4-properties` (new page)

**Features**:
- List all agency GA4 properties
- Add new properties from connected GA4 account
- Assign properties to specific users/dealerships  
- Set property-specific settings (dealership name, target models, etc.)
- Bulk property management

#### 2. Analytics Dashboard Updates

**Multi-Property Selector Component**:
```typescript
interface PropertySelectorProps {
  properties: GA4Property[]
  selectedPropertyIds: string[]
  onPropertyChange: (propertyIds: string[]) => void
  allowMultiple?: boolean
  allowAggregation?: boolean
}
```

**Dashboard Modifications**:
- Property dropdown in header (replace current single-property display)
- "Aggregate All Properties" option for agency-level view
- "Compare Properties" mode with side-by-side metrics
- Property-specific breadcrumbs and context

#### 3. Settings Page Enhancement

**Agency GA4 Settings Section**:
- Agency-level GA4 OAuth setup
- Default property selection
- Aggregation preferences
- Property-specific configuration

### Service Layer Updates

#### Enhanced GA4Service

```typescript
class GA4Service {
  constructor(
    private agencyId: string, 
    private userId?: string  // Optional for agency-level operations
  ) {}
  
  // New methods for multi-property support
  async getAgencyProperties(): Promise<GA4Property[]>
  async getAggregatedAnalytics(propertyIds: string[], dateRange: DateRange): Promise<AggregatedAnalytics>
  async compareProperties(propertyIds: string[], dateRange: DateRange): Promise<PropertyComparison>
  async refreshAgencyTokens(): Promise<void>
  
  // Enhanced existing methods
  async runReport(propertyId: string, options: RunReportOptions)
  async batchRunReports(propertyId: string, requests: any[])
}
```

#### New Services

```typescript
// Property Management Service
class PropertyManagementService {
  async discoverAvailableProperties(agencyId: string): Promise<GA4PropertyInfo[]>
  async assignPropertyToUsers(propertyId: string, userIds: string[]): Promise<void>
  async createPropertyAssignment(propertyData: CreatePropertyData): Promise<GA4Property>
}

// Analytics Aggregation Service  
class AnalyticsAggregationService {
  async aggregateMetrics(properties: GA4Property[], dateRange: DateRange): Promise<AggregatedMetrics>
  async generateComparisonReport(properties: GA4Property[], dateRange: DateRange): Promise<ComparisonReport>
}
```

## Implementation Plan: Phased Approach

### Phase 1: Foundation (Weeks 1-2)
**Scope**: Database schema and core infrastructure

#### Tickets:

**TICKET-MP-001: Database Schema Migration**
- Create new GA4Property, GA4SharedConnection, UserGA4PropertyAccess models
- Add migration scripts with backward compatibility
- Update Agency and User models
- Add necessary indexes for performance

**TICKET-MP-002: Core Service Layer Updates**  
- Extend GA4Service for multi-property support
- Create PropertyManagementService
- Add property validation and error handling
- Update token refresh logic for shared connections

**TICKET-MP-003: Backward Compatibility Layer**
- Create migration utility for existing GA4Connection data
- Add compatibility wrapper for existing single-property APIs
- Ensure existing users continue working without interruption

### Phase 2: API Layer (Weeks 3-4)
**Scope**: New endpoints and API enhancements

**TICKET-MP-004: Property Management APIs**
- POST/GET/PUT/DELETE `/api/ga4/properties/*` endpoints
- Property assignment endpoints
- Validation and permission checks
- Comprehensive API testing

**TICKET-MP-005: Multi-Property Analytics APIs**
- Enhanced analytics endpoints with property selection
- Aggregation endpoints for agency-level data
- Property comparison endpoints
- Performance optimization for multi-property queries

**TICKET-MP-006: Property Discovery & Setup**
- Agency-level GA4 OAuth flow
- Property discovery from connected accounts
- Bulk property import functionality

### Phase 3: UI Implementation (Weeks 5-6)
**Scope**: Admin interfaces and property management

**TICKET-MP-007: Property Management Interface**
- Create `/settings/ga4-properties` admin page
- Property list, add, edit, delete functionality
- User assignment interface
- Property configuration forms

**TICKET-MP-008: Property Selector Component**
- Reusable property selection component
- Multi-select and single-select modes
- Integration with existing analytics components

**TICKET-MP-009: Admin Dashboard Updates**
- Agency admin views for multi-property overview
- Property assignment workflow in user management
- Bulk operations for property management

### Phase 4: Analytics Dashboard (Weeks 7-8)
**Scope**: Enhanced analytics with multi-property support

**TICKET-MP-010: Dashboard Property Integration**
- Add property selector to analytics header
- Update all analytics tabs for property context
- Property-specific breadcrumbs and navigation

**TICKET-MP-011: Aggregated Analytics Views**
- Agency-level aggregated metrics cards
- Combined charts showing data from multiple properties
- Agency performance overview dashboard

**TICKET-MP-012: Property Comparison Features**
- Side-by-side property comparison interface
- Comparative metrics and charts
- Property performance ranking

### Phase 5: Advanced Features (Weeks 9-10)
**Scope**: Advanced analytics and optimizations

**TICKET-MP-013: Advanced Aggregation**
- Weighted aggregation by property importance
- Geographic performance analysis
- Dealership performance ranking

**TICKET-MP-014: Performance Optimization**
- Caching strategies for multi-property data
- Background aggregation jobs
- API response time optimization

**TICKET-MP-015: Comprehensive Testing & Documentation**
- End-to-end testing for all multi-property flows
- User documentation and admin guides
- Performance benchmarking and optimization

## GA4 360 Upgrade Path Considerations

### Current Limitations with Standard GA4
- **Property Limit**: Standard GA4 allows limited properties per account
- **API Quotas**: Potentially restrictive for high-volume agency use
- **Advanced Features**: Missing advanced analysis capabilities

### GA4 360 Benefits for Multi-Property Agencies
- **Higher Limits**: Supports more properties and higher API quotas
- **Advanced Analysis**: Enhanced segmentation and custom dimensions
- **Improved Reporting**: Better aggregation and cross-property analysis
- **Enterprise Support**: Dedicated support for complex implementations

### Migration Strategy
1. **Phase 1-5**: Implement on standard GA4 with quota monitoring
2. **Evaluation Point**: Assess API usage and property count after implementation
3. **GA4 360 Migration**: If needed, provide upgrade path with minimal code changes
4. **Enhanced Features**: Leverage GA4 360 advanced features post-migration

## Development Effort Estimation

### Time Estimates by Phase

| Phase | Tickets | Estimated Effort | Dependencies |
|-------|---------|-----------------|--------------|
| Phase 1: Foundation | MP-001 to MP-003 | 3-4 weeks | None |
| Phase 2: API Layer | MP-004 to MP-006 | 3-4 weeks | Phase 1 |
| Phase 3: UI Implementation | MP-007 to MP-009 | 2-3 weeks | Phase 2 |
| Phase 4: Analytics Dashboard | MP-010 to MP-012 | 3-4 weeks | Phases 1-3 |
| Phase 5: Advanced Features | MP-013 to MP-015 | 2-3 weeks | Phases 1-4 |

**Total Estimated Effort**: 13-18 weeks (3-4.5 months)

### Resource Requirements
- **Senior Full-Stack Developer**: Primary implementation
- **Database Specialist**: Schema design and migration
- **UI/UX Designer**: Multi-property interface design
- **QA Engineer**: Comprehensive testing across all property configurations

## Risk Assessment & Mitigation

### Technical Risks

**Risk**: Data migration complexity for existing users
**Mitigation**: Phased migration with backward compatibility layer and extensive testing

**Risk**: GA4 API quota limitations with multiple properties
**Mitigation**: Implement intelligent caching, batch operations, and monitor usage with GA4 360 upgrade path

**Risk**: Performance degradation with property aggregation
**Mitigation**: Database optimization, query caching, and background processing for heavy operations

### Business Risks

**Risk**: Disruption to existing single-property users
**Mitigation**: Maintain full backward compatibility and provide smooth migration path

**Risk**: Complex user experience with multiple properties
**Mitigation**: Intuitive UI design with sensible defaults and progressive disclosure

## Success Metrics

### Technical Metrics
- Zero breaking changes for existing users
- < 500ms response time for multi-property analytics
- 99.9% uptime during migration
- Full test coverage for new multi-property features

### Business Metrics  
- Successful onboarding of first multi-property agency
- Positive user feedback on property management interface
- Reduced admin overhead for managing multiple dealership analytics
- Increased agency customer retention

## Conclusion

This comprehensive multi-property GA4 implementation will transform SEO Hub from a single-property analytics tool to a full-featured agency platform capable of managing multiple dealership locations with individual tracking while maintaining powerful aggregation and comparison capabilities. The phased approach ensures minimal disruption while building toward a robust, scalable solution.

The existing infrastructure provides an excellent foundation, and the planned implementation leverages current strengths while systematically addressing limitations. With proper execution, this will position SEO Hub as a premier analytics platform for automotive agencies managing multiple dealership properties. 