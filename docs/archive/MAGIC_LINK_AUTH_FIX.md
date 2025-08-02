# Magic Link Authentication Fix

## Overview
This document describes the fix implemented for the user invitation flow that was causing authentication loops.

## Problem Summary
When users were invited to the platform:
1. They received an email with a link to `/onboarding/seoworks?token={userId}` or `/auth/signin`
2. These pages required Google authentication with no bypass for invited users
3. After Google auth, users were redirected back to the signin page, creating a loop
4. The existing magic link authentication system at `/api/invitation` was not being used

## Solution Implemented

### 1. Token Generation
Updated user creation endpoints to generate secure invitation tokens:

**Files Modified:**
- `app/api/admin/agencies/[agencyId]/users/route.ts`
- `app/api/super-admin/users/route.ts`

**Changes:**
```typescript
// Generate invitation token for magic link authentication
const invitationToken = crypto.randomBytes(32).toString('hex')
const invitationTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

const newUser = await prisma.user.create({
  data: {
    // ... other fields
    invitationToken,
    invitationTokenExpires,
  }
})
```

### 2. Magic Link URL Generation
Updated to use the proper magic link endpoint:

```typescript
const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const magicLinkUrl = `${baseUrl}/api/invitation?token=${invitationToken}`

// Pass magic link to email template
const invitationSent = await sendInvitationEmail({
  user: newUser,
  invitedBy,
  loginUrl: magicLinkUrl, // This URL bypasses Google auth
  skipPreferences: true
})
```

### 3. Authentication Flow
When users click the magic link:

1. They hit `/api/invitation?token={secureToken}`
2. The endpoint validates the token and finds the user
3. A session is created automatically
4. Session cookie is set (secure in production)
5. User is redirected to `/dashboard`
6. Token is cleared (one-time use)

## Testing the Fix

### Manual Testing
1. Create a new user through admin panel
2. Check that user has `invitationToken` and `invitationTokenExpires` in database
3. User receives email with magic link URL
4. Clicking the link signs them in automatically without Google auth

### Test Script
Use the provided test script:
```bash
node scripts/test-magic-link.js user@example.com
```

This will:
- Generate a magic link for an existing user
- Display the URL that would be sent in the email
- Show token expiration time

## Troubleshooting

### Common Issues

1. **"User not found" error**
   - Ensure the user exists in the database
   - Check that email matches exactly (case-sensitive)

2. **"Invalid token" error**
   - Token may have expired (7 days for new users)
   - Token was already used (one-time use)
   - Token doesn't match database record

3. **Still redirected to Google auth**
   - Ensure the invitation email contains the magic link URL
   - Check that the URL starts with `/api/invitation?token=`
   - Verify NEXTAUTH_URL environment variable is set correctly

### Database Verification
Check if users have invitation tokens:
```sql
SELECT id, email, invitationToken, invitationTokenExpires 
FROM User 
WHERE invitationToken IS NOT NULL;
```

### Environment Variables
Ensure these are set correctly:
- `NEXTAUTH_URL`: Full URL of your application (e.g., https://yourdomain.com)
- `NEXT_PUBLIC_APP_URL`: Public-facing URL for client-side redirects

## Security Considerations

1. **Token Security**
   - Tokens are 32 bytes of cryptographically secure random data
   - Tokens expire after 7 days
   - Tokens are single-use (cleared after successful authentication)

2. **Session Management**
   - Sessions expire after 30 days
   - Secure cookies used in production
   - HttpOnly cookies prevent JavaScript access

3. **Email Verification**
   - Magic link authentication automatically sets `emailVerified` timestamp
   - No additional email verification needed

## Future Improvements

1. **Resend Invitation**
   - Add endpoint to regenerate expired tokens
   - Allow admins to resend invitations

2. **Token Expiry Configuration**
   - Make token expiry configurable per environment
   - Shorter expiry for production, longer for development

3. **Onboarding Integration**
   - After magic link auth, redirect dealership users to onboarding
   - Preserve any query parameters from original invitation

## Related Files
- `/api/invitation/route.ts` - Magic link authentication endpoint
- `/lib/mailgun/templates.ts` - Email templates
- `/lib/mailgun/invitation.ts` - Invitation email sending logic
- `/prisma/schema.prisma` - User model with invitation fields