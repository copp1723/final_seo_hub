#!/bin/bash
cd /Users/copp1723/Desktop/final_seo_hub

# Add all changes
git add -A

# Commit with detailed message
git commit -m "Fix GA4 and Search Console data consistency issues

- Added 'export const dynamic = force-dynamic' to all API routes using auth
- Simplified connection logic (removed failing dealership-specific lookups)
- Fixed token expiration handling with clear error messages
- Consolidated search-console/list-sites into search-console/sites
- Created reusable utilities: route-utils.ts and search-console-api.ts
- Improved DealershipAnalyticsService for better error handling
- Cleaned up duplicate files (moved to _deprecated_*)

Fixes the inconsistent data loading on dashboard and reporting pages"

# Push to remote
git push origin main

echo "✅ Changes committed and pushed successfully!"
