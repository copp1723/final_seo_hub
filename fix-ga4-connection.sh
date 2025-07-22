#!/bin/bash

echo "🔧 Fixing GA4 connection issues and dashboard errors..."

# Add all the fixes (escape parentheses or use quotes)
git add "app/api/dashboard/analytics-v2/route.ts"
git add "app/(authenticated)/integrations/"

# Commit with descriptive message
git commit -m "fix: Resolve dashboard GA4 connection errors

- Update analytics endpoint to use correct user token models
- Add placeholder data when GA4/Search Console not connected
- Create integrations page for future OAuth setup
- Show connection status on dashboard
- Prevent 'Partial Dashboard Loaded' error message"

# Push to remote
echo "📤 Pushing fixes..."
git push origin main

echo "✅ Fixes pushed! Render will auto-deploy."
echo ""
echo "📊 After deployment:"
echo "1. The dashboard will load without errors"
echo "2. Analytics will show 'N/A' instead of errors"
echo "3. Connection status indicators will be visible"
echo "4. Users can visit /integrations to see connection options"
echo ""
echo "The 'Partial Dashboard Loaded' message will no longer appear!"
