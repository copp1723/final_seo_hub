# Google API Setup for Real Data

## Required Environment Variables

You need to set these environment variables on Render for the Google APIs to work:

```bash
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
```

## How to Get These Values

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable these APIs:
   - Google Analytics Data API
   - Google Search Console API
4. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
5. Choose "Web application"
6. Add authorized redirect URIs:
   - `https://rylie-seo-hub.onrender.com/api/ga4/auth/callback`
   - `https://rylie-seo-hub.onrender.com/api/search-console/callback`
7. Copy the Client ID and Client Secret

## Add to Render

1. Go to your Render dashboard
2. Select your service
3. Go to Environment → Add Environment Variable
4. Add:
   - `GOOGLE_CLIENT_ID` = (paste your client ID)
   - `GOOGLE_CLIENT_SECRET` = (paste your client secret)
5. Save and let it redeploy

## Current Status

The GA4 API fixes have been deployed. Once you add these environment variables, the app will:
- Stop showing mock data
- Start fetching real analytics from your connected GA4 properties
- Show real Search Console data

## Troubleshooting

If you still see errors after adding the environment variables:
1. Make sure the Google account you're using has access to the GA4 properties
2. Check that the property IDs in the database match your actual GA4 property IDs
3. Ensure the OAuth redirect URIs match exactly (including https://)