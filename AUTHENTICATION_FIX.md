# Authentication Issue Fix Guide

## Problem Summary

The authentication issue is caused by:
1. **Missing database enum types** - The production database is missing the PostgreSQL enum types (UserRole, etc.) that Prisma expects
2. **Incorrect session strategy** - The NextAuth configuration wasn't explicitly using the `database` strategy with PrismaAdapter
3. **Session callback inefficiency** - The callback was fetching user data on every request instead of using the populated user object

## Root Cause

The error `type "public.UserRole" does not exist` indicates that the Prisma migrations were never run on the production database. This prevents NextAuth from creating user records during the OAuth flow.

## Solution Steps

### 1. Fix the Database Schema (URGENT)

Run this command on your production environment:

```bash
# Option A: Quick fix for production
chmod +x scripts/fix-production-db.sh
./scripts/fix-production-db.sh
```

Or manually execute these SQL commands:

```sql
-- Create missing enum types
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN');
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "RequestPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE "PackageType" AS ENUM ('SILVER', 'GOLD', 'PLATINUM');
```

### 2. Apply Prisma Migrations

```bash
# Generate Prisma client
npx prisma generate

# Create and apply migrations
npx prisma migrate deploy
```

### 3. Updated NextAuth Configuration

The auth configuration has been updated with:
- Explicit `database` session strategy
- Improved session callback that doesn't refetch data
- Proper cookie configuration for production
- OAuth authorization parameters for better token handling

### 4. Key Configuration Changes

```typescript
// lib/auth.ts
session: {
  strategy: 'database', // Explicitly use database sessions
  maxAge: 30 * 24 * 60 * 60, // 30 days
  updateAge: 24 * 60 * 60, // 24 hours
},
```

## Verification Steps

After applying the fixes:

1. **Check enum types exist:**
   ```sql
   SELECT typname FROM pg_type WHERE typtype = 'e';
   ```

2. **Verify NextAuth tables:**
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('User', 'Account', 'Session', 'VerificationToken');
   ```

3. **Test authentication flow:**
   - Clear browser cookies/cache
   - Try signing in with Google OAuth
   - Check if session persists across page reloads

## Environment Variables

Ensure these are set in production:

```env
DATABASE_URL=postgresql://...
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-secret-key
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

## Important Notes

1. **Database vs JWT Sessions**: With PrismaAdapter, always use database sessions. JWT sessions are incompatible with database adapters.

2. **Session Persistence**: Database sessions are stored in the Session table and linked to users via userId. They persist across server restarts.

3. **Cookie Security**: The updated configuration uses secure cookies in production with proper SameSite settings.

## Monitoring

Add these logs to track authentication:

```typescript
// In auth callbacks
console.log('[Auth] SignIn attempt:', user.email)
console.log('[Auth] Session created for:', session.user.email)
```

## Rollback Plan

If issues persist:
1. Temporarily switch to JWT sessions (remove PrismaAdapter)
2. Debug with `debug: true` in NextAuth config
3. Check Render logs for detailed error messages