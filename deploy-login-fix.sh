#!/bin/bash

echo "📦 Deploying improved login page..."

# Add the changes
git add app/auth/simple-signin/page.tsx

# Commit with descriptive message
git commit -m "feat: Add proper email-based login page for agency admin

- Replace Google-only login with email-based authentication
- Add quick access buttons for known users
- Improve UX with proper form validation
- Keep Google OAuth as secondary option"

# Push to remote
git push origin main

echo "✅ Changes pushed! Render will auto-deploy in a few minutes."
echo ""
echo "📋 After deployment, agency admin can log in at:"
echo "   https://rylie-seo-hub.onrender.com/auth/signin"
echo ""
echo "   Just enter: access@seowerks.ai"
echo "   And click 'Sign in with Email'"
