# User Impersonation Feature

## Overview
The user impersonation feature allows super administrators to temporarily "act as" other users in the system to test functionality, troubleshoot issues, or provide support. This eliminates the need for using incognito windows or complex invitation tokens to switch between user accounts.

## How It Works

### Starting Impersonation

1. **Log in as a Super Admin**
   - Only users with the `SUPER_ADMIN` role can impersonate other users

2. **Click "Impersonate User" Button**
   - Located in the navigation bar (desktop) or mobile menu
   - Opens a search dialog

3. **Search for Target User**
   - Type at least 3 characters to search
   - Search by name or email
   - Results show user details including role, agency, and dealership

4. **Select User to Impersonate**
   - Click "Impersonate" next to the desired user
   - Cannot impersonate other super admins (security measure)

5. **Automatic Session Switch**
   - Current super admin session is replaced with target user session
   - Redirected to dashboard as the impersonated user
   - 4-hour maximum impersonation duration

### During Impersonation

- **Visual Indicator**: Orange badge shows "Impersonating: [user email]"
- **Full User Experience**: See exactly what the impersonated user sees
- **All Permissions Apply**: Limited to the impersonated user's permissions
- **Audit Trail**: All impersonation actions are logged

### Stopping Impersonation

1. **Click "Stop Impersonation"**
   - Available in the same location as the impersonate button
   - Orange-colored button for visibility

2. **Return to Super Admin**
   - Original super admin session is restored
   - Redirected to super admin dashboard
   - Impersonated user session is terminated

## Technical Implementation

### API Endpoints

- `POST /api/super-admin/impersonate` - Start impersonation
- `DELETE /api/super-admin/impersonate` - Stop impersonation  
- `GET /api/super-admin/impersonate` - Check impersonation status

### Session Management

- Uses secure HTTP-only cookies to store original user info
- Creates new NextAuth session for target user
- Cleans up sessions on switch to prevent conflicts

### Security Features

1. **Role Restrictions**
   - Only super admins can impersonate
   - Cannot impersonate other super admins
   - Cannot elevate privileges

2. **Time Limits**
   - 4-hour maximum impersonation duration
   - Automatic session expiry

3. **Audit Logging**
   - All impersonation actions logged to `AuditLog` table
   - Includes who impersonated whom and when
   - IP address and user agent recorded

## Use Cases

1. **Testing Agency Admin Features**
   - Test agency-specific functionality without separate accounts
   - Verify permissions and access controls

2. **Troubleshooting User Issues**
   - See exactly what a user sees
   - Reproduce reported problems
   - Test fixes from user perspective

3. **Demo and Training**
   - Show different user experiences
   - Create training materials
   - Demonstrate role-based features

## Testing the Feature

Run the test script to find the SEOWERKS agency admin details:

```bash
node scripts/test-impersonation.js
```

This will output:
- User details for the agency admin
- Step-by-step testing instructions
- User ID for quick reference

## Best Practices

1. **Always Stop Impersonation When Done**
   - Don't leave impersonation sessions active
   - Return to super admin before logging out

2. **Document Support Actions**
   - Note when impersonation was used for support
   - Record any changes made while impersonating

3. **Respect User Privacy**
   - Only impersonate when necessary
   - Don't access sensitive user data without reason
   - Follow your organization's privacy policies

## Troubleshooting

### "Cannot impersonate another super admin"
- This is by design for security
- Create a test user with lower privileges instead

### Session Issues After Impersonation
- Clear browser cookies
- Log out and log back in
- Check for expired sessions

### Impersonation Button Not Visible
- Verify you're logged in as a super admin
- Check browser console for errors
- Ensure component is properly imported in navigation 