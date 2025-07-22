#!/bin/bash

echo "🔧 Fixing build errors in API routes..."

# Commit the fixes we just made
git add app/api/search-console/primary-site/route.ts
git add app/api/debug/accounts/route.ts

# Check for any other files using old auth
echo "🔍 Checking for other files using old auth..."
grep -r "from '@/lib/auth'" app/ --include='*.ts' --include='*.tsx' | grep -v auth-simple || echo "✅ No more old auth imports found"

# Commit the changes
git commit -m "fix: Fix build errors in API routes

- Fix withValidation usage in search-console/primary-site route
- Update debug/accounts route to use SimpleAuth instead of old auth
- Resolve 'Cannot read properties of undefined' errors"

# Push the fix
echo "📤 Pushing fixes..."
git push origin main

echo "✅ Fixes pushed! Render will rebuild automatically."
echo ""
echo "📊 Monitor the build at: https://dashboard.render.com"
echo ""
echo "The build should complete successfully now, and the agency admin"
echo "will be able to log in at: https://rylie-seo-hub.onrender.com/auth/signin"
