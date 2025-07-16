# Simple Authentication Migration Guide

## Overview
This guide helps you migrate from the complex NextAuth.js system to a simpler, more reliable authentication system that uses direct session management.

## ✅ Problem Solved
The original NextAuth system had sessions in the database but couldn't read them due to cookie configuration issues. The new system bypasses NextAuth entirely and uses direct session validation.

## 🔧 Files Created

### New Authentication System
- `lib/auth-simple.ts` - Core authentication logic
- `app/api/auth/simple-signin/route.ts` - Signin endpoint
- `app/api/auth/simple-session/route.ts` - Session validation endpoint
- `app/api/auth/simple-signout/route.ts` - Signout endpoint
- `app/auth/simple-signin/page.tsx` - New signin page
- `middleware/simple-middleware.ts` - Updated middleware
- `test-simple-auth.js` - Test script

## 🚀 Quick Start

### 1. Test the New System
```bash
# Test the endpoints
node test-simple-auth.js

# Or test manually:
# Visit: https://rylie-seo-hub.onrender.com/auth/simple-signin
# Test: https://rylie-seo-hub.onrender.com/api/auth/simple-session
```

### 2. Switch to New Middleware
Replace your current `middleware.ts` with the simple version:

```bash
# Backup current middleware
cp middleware/middleware.ts middleware/middleware.ts.backup

# Use simple middleware
cp middleware/simple-middleware.ts middleware/middleware.ts
```

### 3. Update Signin Page
Update your signin page to use the new system:

```bash
# Update the signin page
cp app/auth/simple-signin/page.tsx app/auth/signin/page.tsx
```

## 🔍 How It Works

### Session Creation
1. User provides email + invitation token
2. System validates invitation in `user_invites` table
3. Creates session in `sessions` table
4. Sets secure cookie `seo-hub-session`

### Session Validation
1. Reads cookie `seo-hub-session`
2. Validates token against database
3. Returns user info if valid

### Security Features
- HTTP-only cookies
- Secure cookies in production
- 30-day session expiration
- Token signature verification
- Database session cleanup

## 📊 Database Schema Used
- `users` - User information
- `sessions` - Active sessions
- `user_invites` - Invitation tokens

## 🧪 Testing Checklist

- [ ] Test simple signin endpoint
- [ ] Test session validation
- [ ] Test protected routes
- [ ] Test signout functionality
- [ ] Verify cookie is set correctly
- [ ] Test with existing users

## 🔧 Manual Testing Commands

```bash
# Check if endpoints are accessible
curl https://rylie-seo-hub.onrender.com/api/auth/simple-session

# Test signin (replace with actual token)
curl -X POST https://rylie-seo-hub.onrender.com/api/auth/simple-signin \
  -H "Content-Type: application/json" \
  -d '{"email":"josh.copp@onekeel.ai","token":"your-token-here"}'

# Test with browser
# 1. Visit: https://rylie-seo-hub.onrender.com/auth/simple-signin
# 2. Enter email and token
# 3. Check if redirected to dashboard
```

## 🔄 Rollback Plan
If issues occur, revert to NextAuth:

```bash
# Restore original middleware
cp middleware/middleware.ts.backup middleware/middleware.ts

# Restore original signin page
# (keep your backup of original signin page)
```

## 📈 Performance Benefits
- **Faster**: No NextAuth adapter overhead
- **Simpler**: Direct database queries
- **Reliable**: No cookie configuration issues
- **Debuggable**: Clear error messages

## 🎯 Next Steps
1. Test the new system thoroughly
2. Update any client-side auth checks
3. Update navigation components
4. Remove NextAuth dependencies (optional)
5. Update documentation