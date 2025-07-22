# 🚨 EMERGENCY DEMO MODE ACTIVE 🚨

## Status: ENABLED
## Demo Time: July 16, 2025

This application is currently running in **EMERGENCY DEMO MODE** with all authentication bypassed.

### What This Means:
- **ALL USERS** are automatically logged in as SUPER_ADMIN
- No authentication is required
- All protected routes are accessible
- API endpoints return demo super admin session

### Affected Files:
1. `lib/auth-emergency-bypass.ts` - Contains the bypass logic
2. `lib/auth-simple.ts` - Modified to use emergency bypass
3. `app/page.tsx` - Always redirects to dashboard
4. `app/(authenticated)/layout.tsx` - Skips auth check
5. `middleware/middleware.ts` - Allows all access

### To Disable After Demo:
1. Delete `lib/auth-emergency-bypass.ts`
2. Remove emergency bypass imports and checks from `lib/auth-simple.ts`
3. Revert changes to other files (check git history)
4. Set `EMERGENCY_BYPASS_ENABLED = false` if keeping the file

### Demo User Details:
- Email: josh.copp@onekeel.ai
- Role: SUPER_ADMIN
- ID: demo-super-admin

## ⚠️ SECURITY WARNING ⚠️
**DO NOT DEPLOY THIS TO PRODUCTION WITHOUT DISABLING DEMO MODE**