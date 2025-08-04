# Search Console Connection Fix

## Changes Made

1. **Fixed SearchTab.tsx**: Updated "Connect Search Console" button to link directly to `/api/search-console/connect` instead of `/settings`

## Problem Solved
- Users experiencing "Unable to load search data" error can now click "Connect Search Console" and immediately start Google OAuth flow
- Eliminates the extra step of going to settings page first

## Next Steps for Deployment
1. Set up Google OAuth credentials in Google Cloud Console
2. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to Render environment variables
3. Configure authorized redirect URI: https://rylie-seo-hub.onrender.com/api/search-console/callback

## Testing
After deployment, test by:
1. Triggering the search console error state
2. Clicking "Connect Search Console" 
3. Should redirect to Google OAuth immediately
