# SEO Hub Role-Based Access Control Testing Plan

## Current Issues Identified

### 1. **Role Assignment Issues**
- ❌ No mechanism to assign AGENCY_ADMIN or SUPER_ADMIN roles during onboarding
- ❌ All users default to USER role with no way to change it
- ❌ No admin interface to promote users or assign roles

### 2. **Missing Role Enforcement**
- ❌ Admin pages accessible without proper role checks
- ❌ API endpoints lack role-based authorization
- ❌ Navigation shows admin links without role validation

### 3. **Agency Management Issues**
- ❌ No way to assign users to agencies during onboarding
- ❌ Agency creation doesn't automatically assign admin role
- ❌ Missing agency-specific data isolation

## Testing Plan by Role

### DEALERSHIP USER (USER Role) Testing
- [ ] **Onboarding Flow**
  - [ ] Complete onboarding process
  - [ ] Verify package assignment
  - [ ] Check default role assignment (USER)
  
- [ ] **Dashboard Access**
  - [ ] View personal dashboard
  - [ ] See only own requests and tasks
  - [ ] Package usage tracking works
  
- [ ] **Request Management**
  - [ ] Create new requests
  - [ ] View own requests only
  - [ ] Cannot see other users' requests
  
- [ ] **Restrictions**
  - [ ] Cannot access /admin routes
  - [ ] Cannot see agency management features
  - [ ] Cannot change own role or agency

### AGENCY USER (AGENCY_ADMIN Role) Testing
- [ ] **Agency Management**
  - [ ] View agency dashboard
  - [ ] See all dealership requests in agency
  - [ ] Manage agency users
  
- [ ] **Multi-tenant Data**
  - [ ] Only see data from own agency
  - [ ] Cannot access other agencies' data
  
- [ ] **Restrictions**
  - [ ] Cannot access SUPER_ADMIN features
  - [ ] Cannot create new agencies

### SUPER ADMIN Testing
- [ ] **System Management**
  - [ ] Access admin dashboard (/admin)
  - [ ] Create and manage agencies
  - [ ] View all system data
  
- [ ] **User Management**
  - [ ] Promote users to different roles
  - [ ] Assign users to agencies
  
- [ ] **Full Access**
  - [ ] No restrictions on any features

## Implementation Tasks

### 1. Fix Role Assignment System
- [ ] Create role promotion API endpoint
- [ ] Add admin interface for role management
- [ ] Implement agency assignment during onboarding

### 2. Implement Role-Based Authorization
- [ ] Add role checks to all API endpoints
- [ ] Implement middleware for role validation
- [ ] Add role-based UI rendering

### 3. Fix Agency Management
- [ ] Agency assignment during user creation
- [ ] Data isolation by agency
- [ ] Agency admin role assignment

### 4. Create Test Users
- [ ] Create test DEALERSHIP user
- [ ] Create test AGENCY_ADMIN user
- [ ] Create test SUPER_ADMIN user

## Priority Order
1. **HIGH**: Fix role assignment and promotion system
2. **HIGH**: Implement API endpoint authorization
3. **MEDIUM**: Fix navigation role-based rendering
4. **MEDIUM**: Implement agency data isolation
5. **LOW**: Add comprehensive role management UI

## Test Scenarios

### Scenario 1: New Dealership User
1. Sign up with Google OAuth
2. Complete onboarding
3. Verify USER role assignment
4. Test access restrictions

### Scenario 2: Agency Admin Management
1. Promote user to AGENCY_ADMIN
2. Assign to agency
3. Test agency-specific data access
4. Verify restrictions

### Scenario 3: Super Admin Operations
1. Promote user to SUPER_ADMIN
2. Test agency creation
3. Test user role management
4. Verify full system access

## Success Criteria
- [ ] Clear role separation with proper restrictions
- [ ] Data isolation between agencies
- [ ] Secure API endpoints with role validation
- [ ] Intuitive role-based UI experience
- [ ] Comprehensive audit trail for role changes