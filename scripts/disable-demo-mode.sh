#!/bin/bash

# Disable Demo Mode for SEO Hub
# This script disables demo mode and returns to real data

echo "🔄 Disabling Demo Mode for SEO Hub..."

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "No .env.local file found. Demo mode was not enabled."
    exit 1
fi

# Remove demo mode variables
sed -i '' '/DEMO_MODE/d' .env.local 2>/dev/null || sed -i '/DEMO_MODE/d' .env.local
sed -i '' '/# Demo Mode/d' .env.local 2>/dev/null || sed -i '/# Demo Mode/d' .env.local

echo "✅ Demo Mode DISABLED!"
echo ""
echo "🚀 Restart your application to see real data:"
echo "   npm run dev"
echo ""
echo "📊 Your dashboard will now show real:"
echo "   • Live analytics data"
echo "   • Actual request counts"
echo "   • Real activity timeline" 