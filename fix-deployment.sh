#!/bin/bash

echo "🔧 Fixing deployment issues..."

# 1. Fix environment variable validation
echo "📝 Creating fixed environment file..."
cat > .env.production << 'EOF'
APP_NAME=rylie-seo-hub-staging
DATABASE_URL=postgresql://rylie_user:ebXTHowfZmW7tv5PRAxoIyEJXvw27qKS@dpg-d1bmcqmuk2gs739tht80-a.oregon-postgres.render.com/rylie_seo_hub
EMERGENCY_ADMIN_EMAIL=josh.copp@onekeel.ai
EMERGENCY_ADMIN_TOKEN=f02ebeaf3b8d8508c46d4dbfc25c286f
ENCRYPTION_KEY=a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890
GA4_SERVICE_ACCOUNT_EMAIL=seo-ga4-service@onekeel-seo.iam.gserviceaccount.com
GA4_TOKEN_ENCRYPTION_KEY=34f61f4819368d10a1e45d9fbf054762d77ac93fa97ff66865561dc309075810
GOOGLE_CLIENT_ID=703879232708-tkq8cqhhu9sr3qrqeniff908erda3i7v.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
MAILGUN_API_KEY=key-417693d4b9d5684710a402015d0482ce
MAILGUN_DOMAIN=mail.onerylie.com
MAILGUN_FROM_EMAIL=noreply@mail.onerylie.com
NEXTAUTH_SECRET="VHTvtYBUbQTbrJsbJE4s3BOdBuzTIyF5IcKlDvKwILs="
NEXTAUTH_URL=https://rylie-seo-hub.onrender.com
NEXT_PUBLIC_APP_URL=https://rylie-seo-hub.onrender.com
NODE_ENV=production
OPENROUTER_API_KEY=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
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
PORT=3001
SEOWORKS_WEBHOOK_SECRET=7f3e9b5d2a8c4f6e1b9d3c7a5e8f2b4d6c9a1e3f7b5d9c2a6e4f8b1d3c7a9e5f
SUPER_ADMIN_EMAIL=josh.copp@onekeel.ai
EOF

echo "✅ Created .env.production with fixed MAILGUN_API_KEY"

# 2. Update .env as well for consistency
cp .env.production .env

echo "✅ Updated .env file"

echo ""
echo "📌 Next steps:"
echo "1. Verify the MAILGUN_API_KEY is correct (should start with 'key-')"
echo "2. Run the deployment fix script: ./run-deployment-fix.sh"
echo ""
echo "Note: If the API key format is different, please update it manually in both .env and .env.production"
