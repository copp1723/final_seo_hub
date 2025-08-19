# Multi-Dealership Access System - Setup & User Guide

## Overview

The Multi-Dealership Access System allows users to have access to multiple dealerships with granular permission levels, eliminating the need to log in/out when switching between different dealership accounts.

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Database Setup](#database-setup)
3. [User Access Levels](#user-access-levels)
4. [Setup Workflows](#setup-workflows)
5. [User Onboarding](#user-onboarding)
6. [Admin Management](#admin-management)
7. [Troubleshooting](#troubleshooting)

---

## System Requirements

### Prerequisites
- Existing SEO Hub installation
- PostgreSQL database with Prisma ORM
- SUPER_ADMIN user account for initial setup

### Database Migration
The system requires a database migration to add the multi-dealership tables:

```bash
# Apply the migration
npx prisma db push

# Or if using migration files
npx prisma migrate deploy
```

---

## User Access Levels

### Permission Hierarchy

| Level | Permissions | Use Case |
|-------|-------------|----------|
| **READ** | View data, reports, analytics | Marketing managers viewing performance |
| **WRITE** | READ + Edit content, create requests | Content managers, SEO coordinators |
| **ADMIN** | WRITE + User management, settings | Dealership administrators |

### Access Level Details

#### READ Access
- ✅ View dashboard analytics
- ✅ View SEO reports and rankings
- ✅ View existing content and requests
- ❌ Cannot create or edit content
- ❌ Cannot manage users or settings

#### WRITE Access
- ✅ All READ permissions
- ✅ Create and edit SEO requests
- ✅ Update dealership content
- ✅ Manage campaign settings
- ❌ Cannot manage users

#### ADMIN Access
- ✅ All WRITE permissions
- ✅ Manage dealership users
- ✅ Configure integrations (GA4, Search Console)
- ✅ Access all administrative functions

---

## Setup Workflows

### 1. Agency Complete Onboarding (Recommended)

**For new agencies setting up multiple dealerships:**

1. **Agency Self-Registration**
   ```
   Navigate to: /onboarding/seoworks
   ```
   - Agency fills out complete information
   - Creates all dealership profiles in one session
   - Automatically sets up multi-dealership access

2. **Benefits**
   - Single onboarding session
   - Consistent data entry
   - Immediate multi-dealership access
   - No invitation management needed

### 2. SUPER_ADMIN Management Setup

**For existing agencies needing multi-dealership access:**

1. **Access User Management**
   ```
   Navigate to: /admin/users/[userId]/dealership-access
   ```

2. **Grant Individual Access**
   - Select target dealership
   - Choose appropriate access level (READ/WRITE/ADMIN)
   - Set optional expiration date
   - Save changes

3. **Bulk Assignment (Multiple Users)**
   ```
   Navigate to: /admin/users
   Use: Bulk Dealership Assignment tool
   ```
   - Select multiple users
   - Select multiple dealerships
   - Set uniform access level
   - Execute bulk assignment

---

## User Onboarding

### For Marketing Managers with Multiple Stores

#### Initial Setup Process

1. **Account Creation**
   - Contact SUPER_ADMIN for account setup
   - Provide list of all dealerships requiring access
   - Specify required access level per dealership

2. **First Login**
   ```
   URL: /auth/simple-signin?email=your-email@domain.com
   ```
   - Enter your email address
   - System creates session with multi-dealership access

3. **Dealership Switching**
   - Look for dealership switcher in top navigation
   - Dropdown shows all authorized dealerships
   - Click to switch context instantly
   - Page refreshes with new dealership data

#### Using the Dealership Switcher

**Location**: Top navigation bar (appears only for multi-access users)

**Interface Elements**:
- 🏢 Building icon indicates dealership context
- Dropdown shows: Dealership Name, Agency, Access Level
- ✅ Checkmark indicates current selection
- 🔄 Loading spinner during switching

**Example Usage**:
```
Current: ABC Motors (Smith Auto Group) [WRITE]
Switch to: XYZ Dealership (Smith Auto Group) [READ]
```

### For Agency Users Managing Multiple Clients

#### Setup Requirements

1. **Agency Administrator Role**
   - Must have AGENCY_ADMIN role
   - Associated with specific agency
   - Can manage dealerships within agency only

2. **Access Pattern**
   - Generally granted ADMIN access to all agency dealerships
   - Can create and manage content across all locations
   - Responsible for user management within dealerships

#### Daily Workflow

1. **Morning Routine**
   - Login once to agency account
   - Review dashboard for all dealerships
   - Switch between locations as needed

2. **Content Management**
   - Switch to specific dealership
   - Create/edit SEO content
   - Review performance metrics
   - Switch to next dealership

3. **Reporting**
   - Access consolidated reporting
   - Switch between dealerships for detailed analysis
   - Export data per location

---

## Admin Management

### SUPER_ADMIN Functions

#### User Access Management

1. **Individual User Management**
   ```
   Path: /admin/users/[userId]/dealership-access
   Actions:
   - Grant new access
   - Update existing access levels
   - Revoke access
   - Set expiration dates
   ```

2. **Bulk Operations**
   ```
   Path: /admin/users (Bulk Assignment Tool)
   Capabilities:
   - Multi-user selection
   - Multi-dealership selection
   - Uniform access level assignment
   - Batch processing
   ```

#### Access Monitoring

**Current Access View**:
- Lists all active permissions
- Shows access levels and expiration dates
- Displays grant history
- Provides revocation options

**Audit Trail** (Coming Soon):
- User access changes
- Permission modifications
- Login/switch activities
- Administrative actions

### AGENCY_ADMIN Functions

#### Dealership Management
- Create new dealerships within agency
- Manage dealership settings
- Configure integrations (GA4, Search Console)
- Oversee content strategy

#### User Management
- Invite users to specific dealerships
- Set appropriate access levels
- Monitor user activity
- Manage team permissions

---

## Troubleshooting

### Common Issues

#### "Dealership Switcher Not Visible"

**Cause**: User has access to only one dealership or no multi-access permissions

**Solution**:
1. Verify user has access to multiple dealerships
2. Check user role (appears for USER and DEALERSHIP_ADMIN)
3. Contact SUPER_ADMIN to grant additional access

#### "Cannot Switch Dealership"

**Cause**: Session or permission issues

**Solutions**:
1. **Refresh browser session**:
   ```
   Logout and login again
   Clear browser cache
   ```

2. **Verify permissions**:
   ```
   Check access hasn't expired
   Confirm dealership is still active
   Verify user still has required permissions
   ```

#### "Access Denied After Switching"

**Cause**: Insufficient permissions for specific actions

**Solution**:
1. Check current access level (visible in switcher)
2. Contact admin to upgrade permissions if needed
3. Verify action requires your current access level

### Error Messages

| Error | Meaning | Resolution |
|-------|---------|------------|
| "No dealership access found" | User has no multi-dealership permissions | Contact SUPER_ADMIN for setup |
| "Access expired" | User's access has passed expiration date | Request access renewal |
| "Invalid dealership" | Trying to access non-existent dealership | Verify dealership still exists |
| "Insufficient permissions" | Action requires higher access level | Request permission upgrade |

### Support Escalation

#### For Users:
1. Check this documentation first
2. Verify permissions with dealership admin
3. Contact agency administrator
4. Escalate to SUPER_ADMIN if needed

#### For Admins:
1. Review user access logs
2. Check database for permission records
3. Verify database migration completed
4. Contact technical support

---

## API Reference

### User Switch Dealership

```javascript
// GET - Fetch available dealerships
GET /api/user/switch-dealership

// POST - Switch to specific dealership
POST /api/user/switch-dealership
{
  "dealershipId": "dealership_123"
}
```

### Admin User Management

```javascript
// GET - Fetch user's current access
GET /api/admin/users/[userId]/dealership-access

// POST - Grant new access
POST /api/admin/users/[userId]/dealership-access
{
  "dealershipId": "dealership_123",
  "accessLevel": "WRITE"
}

// PATCH - Update existing access
PATCH /api/admin/users/[userId]/dealership-access/[accessId]
{
  "accessLevel": "ADMIN"
}

// DELETE - Revoke access
DELETE /api/admin/users/[userId]/dealership-access/[accessId]
```

---

## Best Practices

### For Agencies
1. **Use Agency Complete Onboarding** for new setups
2. **Standardize access levels** across similar roles
3. **Regular access audits** to maintain security
4. **Document user responsibilities** per access level

### For Users
1. **Always verify current dealership** before making changes
2. **Use appropriate access level** for each task
3. **Report access issues** promptly to administrators
4. **Keep dealership context** in mind when viewing data

### For Administrators
1. **Follow principle of least privilege** when granting access
2. **Set expiration dates** for temporary access
3. **Monitor user activity** across dealerships
4. **Maintain backup admin access** for each dealership

---

## Changelog

### Version 2.0.0 (Current)
- ✅ Multi-dealership access system
- ✅ Granular permission levels (READ/WRITE/ADMIN)
- ✅ Seamless dealership switching
- ✅ SUPER_ADMIN management interface
- ✅ Bulk user assignment tools
- ✅ Agency complete onboarding workflow

### Planned Features
- 🔄 Advanced audit logging
- 🔄 Automated access provisioning
- 🔄 Role-based access templates
- 🔄 Cross-agency user management
- 🔄 API access controls