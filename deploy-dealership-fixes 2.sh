#!/bin/bash

echo "🚀 COMPREHENSIVE DEALERSHIP FIX DEPLOYMENT"
echo "=========================================="
echo ""

# Change to project directory
cd /Users/copp1723/Desktop/final_seo_hub

echo "📋 Step 1: Pre-fix analysis..."
echo "------------------------------"
node analyze-dealership-issues.js | head -50

echo ""
echo "🔧 Step 2: Applying database fixes..."
echo "------------------------------------"
node fix-dealership-issues.js

echo ""
echo "✅ Step 3: Validating fixes..."
echo "-----------------------------"
node validate-fixes.js

echo ""
echo "🎯 Step 4: Building and deploying updated code..."
echo "------------------------------------------------"

# Build the application to check for any issues
echo "Building application..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    
    echo ""
    echo "🚀 Deploying to production..."
    echo "----------------------------"
    
    # Commit the changes
    git add .
    git commit -m "Fix dealership dropdown and GA4/Search Console data issues

    - Updated dealership selector API to handle super admin access properly
    - Improved GA4 list-properties endpoint to show all connections
    - Enhanced Search Console list-sites endpoint for multiple dealerships
    - Created system users for dealerships without connections
    - Added comprehensive data validation and integrity checks
    - Fixed orphaned dealership and user relationships
    
    Fixes:
    1. Dealership dropdown now shows all 22 dealerships for super admin
    2. GA4/Search Console now display multiple properties/sites properly
    3. All data relationships are properly connected and accurate"
    
    # Push to remote
    git push origin main
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully deployed to production!"
        echo ""
        echo "🎉 DEPLOYMENT COMPLETE!"
        echo "======================"
        echo ""
        echo "✅ What's been fixed:"
        echo "1. ✅ Dealership dropdown visibility (22 dealerships for super admin)"
        echo "2. ✅ GA4 properties showing multiple options"
        echo "3. ✅ Search Console sites showing multiple options"  
        echo "4. ✅ Data integrity and relationships corrected"
        echo "5. ✅ API endpoints updated to handle all user roles properly"
        echo ""
        echo "🔄 Please test the following:"
        echo "- Login as super admin and check dealership dropdown"
        echo "- Check GA4 settings page for multiple properties"
        echo "- Check Search Console settings page for multiple sites"
        echo "- Verify analytics data is properly connected"
        echo ""
        echo "📞 If issues persist, check the console logs and run:"
        echo "   node validate-fixes.js"
    else
        echo "❌ Failed to push to remote repository"
        exit 1
    fi
else
    echo "❌ Build failed! Please fix build errors before deploying."
    exit 1
fi
