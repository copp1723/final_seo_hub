# Google Console & GA4 Authentication Troubleshooting

## Current Issues Identified

### 1. Environment Configuration ✅ FIXED
- Added missing `NEXTAUTH_URL` to `.env`
- Google OAuth credentials are properly configured

### 2. Dealership API 500 Error 🔧 IMPROVED
- Enhanced error logging in `/api/dealerships/switch`
- Added detailed error messages for debugging

### 3. GA4 Token Encryption 🔧 FIXED
- Fixed GA4 callback to properly encrypt tokens before storing
- Updated encryption import in callback route

## Step-by-Step Troubleshooting

### Step 1: Test Your Setup
Run the debug scripts to verify configuration:

```bash
# Test Google OAuth configuration
node test-google-oauth.js

# Test GA4 authentication setup  
node debug-ga4-auth.js
```

### Step 2: Test Authentication Flow
1. Start your development server
2. Navigate to `/api/debug/dealership-test` to check user session
3. Try the GA4 connection at `/api/ga4/auth/connect`

### Step 3: Google Cloud Console Setup
Ensure your Google Cloud Console is configured correctly:

1. **OAuth 2.0 Client IDs**:
   - Authorized redirect URIs should include:
     - `https://rylie-seo-hub-staging.onrender.com/api/ga4/auth/callback`
     - `http://localhost:3000/api/ga4/auth/callback` (for local dev)

2. **APIs & Services**:
   - Enable Google Analytics Reporting API
   - Enable Google Analytics Data API

3. **OAuth Consent Screen**:
   - Configure with your domain
   - Add test users if in testing mode

### Step 4: Manual GA4 Connection Test
Use this OAuth URL to test manually:

```
https://accounts.google.com/o/oauth2/v2/auth?client_id=703879232708-tkq8cqhhu9sr3qrqeniff908erda3i7v.apps.googleusercontent.com&redirect_uri=https%3A%2F%2Frylie-seo-hub-staging.onrender.com%2Fapi%2Fga4%2Fauth%2Fcallback&response_type=code&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fanalytics.readonly+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fanalytics+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fanalytics.edit+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fanalytics.manage.users&access_type=offline&prompt=consent&state=test-user-id
```

### Step 5: Check Server Logs
Monitor your application logs for:
- Database connection errors
- Authentication failures
- API request/response details

## Common Solutions

### If you get "No dealerships available"
1. Check if your user is properly associated with an agency
2. Verify dealerships exist in the database for your agency
3. Test with the debug endpoint: `/api/debug/dealership-test`

### If GA4 connection fails
1. Verify Google Cloud Console configuration
2. Check that Analytics APIs are enabled
3. Ensure OAuth consent screen is published (not in testing mode)
4. Try the manual OAuth URL above

### If you get 500 errors
1. Check server logs for detailed error messages
2. Verify database connectivity
3. Ensure all environment variables are set correctly

## Next Steps
1. Run the debug scripts to identify specific issues
2. Check your Google Cloud Console configuration
3. Test the manual OAuth flow
4. Monitor server logs during authentication attempts

## Need Help?
If issues persist, check:
- Server logs in your hosting platform
- Browser developer console for JavaScript errors
- Network tab for failed API requests