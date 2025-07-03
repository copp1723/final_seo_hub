# Multi-Agent Structure Implementation

This document outlines the implementation of the multi-agent structure features for better role hierarchy and multi-tenancy support.

## Features Implemented

### 1. Enhanced Agency Admin Privileges

**What Changed:**
- Agency admins can now view and manage ALL dealership requests within their agency
- Previously, they could only see their own requests
- The `/api/requests` endpoint now properly filters based on user role:
  - `SUPER_ADMIN`: Sees all requests system-wide
  - `AGENCY_ADMIN` with agencyId: Sees all requests in their agency
  - `ADMIN` with agencyId: Sees all requests in their agency
  - Regular `USER`: Sees only their own requests

**Files Modified:**
- `app/api/requests/route.ts` - Updated access control logic

### 2. Email Domain Auto-Assignment

**What's New:**
- Users are automatically assigned to agencies based on their email domain when they sign in
- Only applies to regular users (not admins)
- Happens seamlessly during the authentication flow

**How It Works:**
1. When a user signs in, the system checks their email domain
2. If an agency exists with a matching domain, the user is automatically assigned
3. This only happens for new users or users without an existing agency assignment

**Files Modified:**
- `lib/auth.ts` - Added domain checking logic in session callback

### 3. Dealer Invitation System

**New Features:**
- Agency admins can invite dealers to join their agency
- Invitations are sent via email with a unique link
- Invitees must sign in with the correct email to accept
- Support for personalized messages in invitations
- Tracking of invitation status (pending, accepted, expired)

**Components:**
1. **Database Model** (`Invitation`):
   - Tracks who invited whom
   - Stores role assignment for new user
   - Includes expiration (7 days)
   - Prevents duplicate invitations

2. **API Endpoints**:
   - `POST /api/admin/agencies/[agencyId]/invitations` - Create invitation
   - `GET /api/admin/agencies/[agencyId]/invitations` - List invitations
   - `DELETE /api/admin/agencies/[agencyId]/invitations` - Cancel invitation
   - `GET/POST /api/auth/accept-invitation` - Accept invitation flow

3. **UI Components**:
   - Invitation management tab in agency users page
   - Beautiful invitation acceptance page
   - Real-time status tracking

**Files Created:**
- `prisma/schema.prisma` - Added Invitation model
- `app/api/admin/agencies/[agencyId]/invitations/route.ts` - Invitation management API
- `app/api/auth/accept-invitation/route.ts` - Invitation acceptance API
- `app/auth/accept-invitation/page.tsx` - Invitation acceptance UI
- `prisma/migrations/20240101000000_add_invitation_system/migration.sql` - Database migration

**Files Modified:**
- `app/(authenticated)/admin/agencies/[agencyId]/users/page.tsx` - Added invitation UI

### 4. Self-Serve Agency Onboarding

**What's Enabled:**
- Agency admins can now fully manage their dealer network
- No need for super admin intervention for basic user management
- Complete invitation lifecycle management
- Automatic role assignment based on invitation

## Security Considerations

1. **Role-Based Access Control**:
   - Agency admins can only invite users with USER or AGENCY_ADMIN roles
   - Cannot escalate privileges beyond their own level
   - Cannot modify SUPER_ADMIN or ADMIN users

2. **Invitation Security**:
   - Unique tokens for each invitation
   - 7-day expiration
   - Email verification required
   - One invitation per email per agency

3. **Domain Assignment**:
   - Only applies to regular users
   - Existing agency assignments are not overridden
   - Domain matching is case-insensitive

## Usage Guide

### For Agency Admins

1. **Viewing All Agency Requests**:
   - Navigate to your dashboard
   - All dealership requests from your agency will be visible

2. **Inviting Dealers**:
   - Go to Admin → Manage Users
   - Click "Invite User"
   - Enter email, name (optional), role, and message
   - Send invitation

3. **Managing Invitations**:
   - View pending, accepted, and expired invitations
   - Cancel pending invitations if needed
   - Track acceptance status

### For Invited Users

1. **Accepting an Invitation**:
   - Click the link in the invitation email
   - Sign in with the invited email address
   - Click "Accept Invitation"
   - You'll be redirected to the dashboard

### For System Administrators

1. **Setting Up Domain Auto-Assignment**:
   - Add agency domain in agency settings
   - Users with matching email domains will auto-join

2. **Monitoring**:
   - All invitation activities are logged
   - Track agency growth through invitation metrics

## Database Migration

Run the following command to apply the database changes:

```bash
npx prisma migrate deploy
```

Or if in development:

```bash
npx prisma migrate dev
```

## Environment Variables

No new environment variables are required. The system uses existing:
- `NEXT_PUBLIC_APP_URL` - For invitation links
- `DATABASE_URL` - For database connection
- Email configuration - For sending invitations

## Future Enhancements

1. **Bulk Invitations**: Allow CSV upload for multiple invitations
2. **Invitation Templates**: Save common invitation messages
3. **Analytics**: Track invitation conversion rates
4. **Custom Expiration**: Allow setting custom expiration times
5. **Resend Invitations**: Allow resending expired invitations