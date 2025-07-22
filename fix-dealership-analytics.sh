#!/bin/bash

echo "🔧 Fixing dealership-specific analytics..."

# Add the updated analytics route
git add app/api/dashboard/analytics-v2/route.ts

# Add helper files
git add dashboard-connection-fix.tsx
git add setup-dealership-analytics.js

# Commit with descriptive message
git commit -m "fix: Implement dealership-specific analytics

- Analytics now properly filter by selected dealership
- Shows 'Select dealership' message when none selected
- Displays dealership-specific GA4 and Search Console data
- Shows proper connection status per dealership
- Removes confusing account-wide connection indicators
- Each dealership needs its own GA4 property ID and site URL configured"

# Push to remote
echo "📤 Pushing fixes..."
git push origin main

echo "✅ Fixes pushed! Render will auto-deploy."
echo ""
echo "📊 What's Fixed:"
echo "1. Analytics are now dealership-specific"
echo "2. Connection status shows per-dealership configuration"
echo "3. 'Select dealership' prompt when none selected"
echo "4. No more misleading 'Error' messages"
echo ""
echo "🔄 To configure dealerships:"
echo "1. Run: node setup-dealership-analytics.js"
echo "2. Add GA4 property IDs for each dealership"
echo "3. Ensure site URLs are configured"
echo ""
echo "The dashboard will now properly show data for the selected dealership only!"
