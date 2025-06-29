# Deployment Guide for Render

## Prerequisites

1. Create a Render account at https://render.com
2. Have your environment variables ready
3. Ensure your GitHub repository is pushed

## Deployment Steps

1. **Connect GitHub Repository**
   - In Render dashboard, click "New +"
   - Select "Web Service"
   - Connect your GitHub account if not already connected
   - Select the `final_seo_hub` repository

2. **Configure Service**
   - Name: `rylie-seo-hub`
   - Environment: `Node`
   - Build Command: `./build.sh`
   - Start Command: `npm start`

3. **Set Environment Variables**
   
   Required variables to set manually:
   ```
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GA4_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
   OPENROUTER_API_KEY=sk-or-v1-your-openrouter-api-key
   ```

   Auto-generated variables (Render will create these):
   - `DATABASE_URL` (from database)
   - `NEXTAUTH_URL` (from service URL)
   - `NEXTAUTH_SECRET`
   - `ENCRYPTION_KEY`
   - `GA4_TOKEN_ENCRYPTION_KEY`
   - `SEOWORKS_WEBHOOK_SECRET`

4. **Database Setup**
   - Render will automatically create a PostgreSQL database
   - Migrations will run automatically during deployment

5. **Deploy**
   - Click "Create Web Service"
   - Wait for the build and deployment to complete

## Post-Deployment

1. **Update OAuth Redirect URLs**
   - Add your Render URL to Google OAuth authorized redirect URIs:
     - `https://your-app.onrender.com/api/auth/callback/google`
     - `https://your-app.onrender.com/api/ga4/auth/callback`
     - `https://your-app.onrender.com/api/search-console/callback`

2. **Configure Webhook URL**
   - Share this webhook URL with SEOWorks:
     - `https://your-app.onrender.com/api/seoworks/webhook`
   - Include the `SEOWORKS_WEBHOOK_SECRET` value

## Monitoring

- Check deployment logs in Render dashboard
- Monitor the `/api/health` endpoint
- Review database connections in the database dashboard

## Troubleshooting

### Build Failures
- Check build logs for missing dependencies
- Ensure all environment variables are set
- Verify database connection string format

### Runtime Errors
- Check runtime logs in Render dashboard
- Verify all OAuth credentials are correct
- Ensure database migrations completed successfully