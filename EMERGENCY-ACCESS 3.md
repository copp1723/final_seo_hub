# Emergency Access Guide for SEO Hub

This guide provides solutions for accessing your SEO Hub instance when locked out, particularly for super admin access.

## The Problem

SEO Hub has a circular dependency in its authentication system:
- To log in, you need an invitation token
- To create an invitation token, you need to be logged in as super admin
- If there are no super admins or valid tokens, you're locked out

## Solution 1: Emergency Access Token (Recommended)

### Setup (One-time configuration in Render)

1. Go to your Render dashboard
2. Navigate to your SEO Hub service → Environment
3. Add these environment variables:
   - `EMERGENCY_ADMIN_TOKEN`: A secure random string (e.g., generate with `openssl rand -hex 32`)
   - `EMERGENCY_ADMIN_EMAIL`: Your emergency admin email (default: emergency@seohub.com)

### Using Emergency Access

Once configured, you can log in immediately:

1. Go to: https://rylie-seo-hub.onrender.com/auth/simple-signin
2. Enter:
   - Email: The value of `EMERGENCY_ADMIN_EMAIL` (or emergency@seohub.com if not set)
   - Token: The value of `EMERGENCY_ADMIN_TOKEN`
3. Click Sign In

This will create a super admin user if it doesn't exist and log you in immediately.

## Solution 2: Create Invitations via API

With the emergency token configured, you can create invitations for any user:

### Using the provided script:

```bash
# Set your emergency token
export EMERGENCY_ADMIN_TOKEN="your-emergency-token"

# Create a super admin invitation
./scripts/create-emergency-invite.sh josh.copp@onekeel.ai SUPER_ADMIN

# Create an agency admin invitation
./scripts/create-emergency-invite.sh user@example.com AGENCY_ADMIN agency-id-here
```

### Using curl directly:

```bash
curl -X POST https://rylie-seo-hub.onrender.com/api/auth/emergency-invite \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_EMERGENCY_TOKEN" \
  -d '{
    "email": "josh.copp@onekeel.ai",
    "role": "SUPER_ADMIN"
  }'
```

## Solution 3: Direct Database Access (Last Resort)

If the above solutions don't work, use the Render shell:

```sql
-- Create placeholder user for foreign key constraint
INSERT INTO users (id, email, role, "createdAt", "updatedAt") VALUES (
    '00000000-0000-0000-0000-000000000000', 
    'placeholder@seohub.com', 
    'SUPER_ADMIN', 
    NOW(), 
    NOW()
);

-- Create your user
INSERT INTO users (id, email, role, "createdAt", "updatedAt") VALUES (
    gen_random_uuid(), 
    'josh.copp@onekeel.ai', 
    'SUPER_ADMIN', 
    NOW(), 
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Create invitation
INSERT INTO user_invites (id, email, role, "isSuperAdmin", "agencyId", "invitedBy", token, status, "expiresAt", "createdAt", "updatedAt") VALUES (
    gen_random_uuid(),
    'josh.copp@onekeel.ai',
    'SUPER_ADMIN',
    true,
    NULL,
    '00000000-0000-0000-0000-000000000000',
    encode(gen_random_bytes(32), 'hex'),
    'pending',
    NOW() + INTERVAL '7 days',
    NOW(),
    NOW()
);

-- Get your token
SELECT token FROM user_invites WHERE email = 'josh.copp@onekeel.ai' ORDER BY "createdAt" DESC LIMIT 1;
```

## Best Practices

1. **Always set EMERGENCY_ADMIN_TOKEN** in production to avoid lockouts
2. **Keep the emergency token secure** - treat it like a master password
3. **Rotate the token periodically** for security
4. **Document your token** in a secure password manager
5. **Create multiple super admins** to reduce dependency on a single account

## Security Considerations

- The emergency access token bypasses normal authentication
- Only share it with trusted administrators
- Monitor usage through application logs
- Consider implementing IP restrictions for emergency access
- Rotate tokens after any security incident

## Troubleshooting

### "Unauthorized" error when using emergency token
- Verify EMERGENCY_ADMIN_TOKEN is set in Render environment variables
- Ensure you're using the exact token value (no extra spaces)
- Check that the Authorization header format is: `Bearer YOUR_TOKEN`

### "User already exists" error
- The email already has an account
- Use the existing user's credentials or create a new invitation

### Token expired immediately
- Database timezone mismatch
- Use a longer expiration time in the SQL command

## Support

If you continue experiencing issues:
1. Check Render logs for detailed error messages
2. Verify database connectivity
3. Ensure all environment variables are properly set
4. Contact support with specific error messages