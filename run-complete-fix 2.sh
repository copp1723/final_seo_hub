#!/bin/bash

echo "🔧 Running dealership fixes..."
echo "=============================="

cd /Users/copp1723/Desktop/final_seo_hub

echo "📊 Step 1: Analyzing current state..."
node analyze-dealership-issues.js

echo ""
echo "🔧 Step 2: Applying fixes..."
node fix-dealership-issues.js

echo ""
echo "✅ Fixes completed! Please test the application."
echo ""
echo "🎯 What should be fixed now:"
echo "1. Dealership dropdown should show all 22 dealerships for super admin"
echo "2. Regular users should see dealerships from their agency"
echo "3. GA4 should show multiple property options" 
echo "4. Search Console should show multiple site options"
echo "5. All data should be properly connected and accurate"
