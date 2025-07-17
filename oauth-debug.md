# OAuth Connection Debug Guide

## Current Issues Identified

Based on your OAuth implementation, here are the most likely causes of the "Connection Failed" error:

### 1. Google Cloud Console Redirect URI Mismatch
Your app is running on: `https://rylie-seo-hub.onrender.com`

**Required Redirect URIs in Google Cloud Console:**
- `https://rylie-seo-hub.onrender.com/api/ga4/auth/callback`
- `https://rylie-seo-hub.onrender.com/api/search-console/callback`

### 2. Environment Variables Check
✅ GOOGLE_CLIENT_ID: Present
✅ GOOGLE_CLIENT_SECRET: Present  
✅ NEXTAUTH_URL: Present (`https://rylie-seo-hub.onrender.com`)

### 3. Database Schema Issues
The code tries to create connections with both `userId` and `dealershipId`, but there might be foreign key constraints.

### 4. Error Handling Improvements
Added better logging to track exactly where the OAuth flow fails.

## Quick Fixes Applied

1. **Enhanced Logging**: Added detailed logs to track OAuth flow
2. **Fixed Redirect URLs**: Corrected redirect URLs to match settings page structure
3. **Proper User/Dealership Lookup**: Fixed dealership association logic
4. **Better Error Messages**: More specific error reporting

## Next Steps

1. **Check Google Cloud Console**:
   - Go to Google Cloud Console → APIs & Services → Credentials
   - Find your OAuth 2.0 Client ID
   - Verify redirect URIs match exactly:
     - `https://rylie-seo-hub.onrender.com/api/ga4/auth/callback`
     - `https://rylie-seo-hub.onrender.com/api/search-console/callback`

2. **Test the Connection**:
   - Try connecting GA4 again
   - Check the server logs for detailed error messages
   - The logs will now show exactly where the process fails

3. **Database Check**:
   - Verify the user has a proper dealership association
   - Check if there are any foreign key constraint errors

## Common OAuth Errors

- **redirect_uri_mismatch**: Redirect URI in Google Console doesn't match
- **invalid_client**: Client ID/Secret mismatch
- **access_denied**: User denied permissions
- **invalid_grant**: Authorization code expired or invalid

## Testing Commands

```bash
# Check logs during OAuth flow
tail -f /var/log/app.log

# Test database connection
curl https://rylie-seo-hub.onrender.com/api/debug/search-console-diagnostic
```