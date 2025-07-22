#!/bin/bash

# Script to commit and push the GA4 and Search Console data consistency fixes

echo "🚀 Committing GA4 and Search Console data consistency fixes..."

# Add all the modified files
git add -A

# Create a detailed commit message
git commit -m "Fix GA4 and Search Console data consistency issues

BREAKING CHANGES:
- All API routes now use dynamic rendering (fixes static build errors)
- Simplified connection logic (removes failing dealership-specific lookups)
- Consolidated duplicate Search Console routes

FIXES:
- Added 'export const dynamic = force-dynamic' to all auth-based routes
- Fixed token expiration handling with clear error messages
- Removed complex dealership-specific connection lookups
- Consolidated search-console/list-sites into search-console/sites
- Improved error visibility for expired tokens
- Added proper caching without hiding errors

IMPROVEMENTS:
- Created reusable route utilities in /lib/api/route-utils.ts
- Created centralized Search Console API in /lib/api/search-console-api.ts
- Simplified DealershipAnalyticsService to use user-level connections only
- Standardized error responses across all routes
- Better logging for debugging data fetch issues

CLEANUP:
- Moved old list-sites route to _deprecated_list-sites
- Moved duplicate analytics service files to _deprecated_*
- All routes now use consistent SimpleAuth pattern

This should resolve the 'nightmare' of inconsistent data loading on dashboard
and reporting pages. Users will now see clear error messages when tokens
expire and need to reconnect in settings."

# Show the status
echo "📊 Git status:"
git status --short

# Push to remote
echo ""
echo "🔄 Pushing to remote..."
git push origin main

echo ""
echo "✅ Changes have been committed and pushed!"
echo ""
echo "📝 Summary of changes:"
echo "- Fixed dynamic rendering for all API routes"
echo "- Simplified connection logic (no more dealership-specific lookups)"
echo "- Improved error handling for expired tokens"
echo "- Consolidated duplicate routes"
echo "- Cleaned up old code patterns"
echo ""
echo "🎯 Next steps:"
echo "1. Deploy these changes to production"
echo "2. Clear browser cache and localStorage"
echo "3. Test data loading on dashboard and reporting pages"
echo "4. Reconnect GA4/Search Console if you see 'authentication expired' messages"
