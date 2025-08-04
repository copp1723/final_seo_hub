#!/bin/bash

echo "Emergency fix for 500 error on request creation..."

cd /Users/copp1723/Desktop/final_seo_hub

# Add the fix
git add app/api/requests/route.ts

# Add migration if needed
git add prisma/migrations/20250108_fix_seoworks_mapping/migration.sql 2>/dev/null || true

# Commit
git commit -m "Fix 500 error on request creation

- Handle null agencyId in request creation
- Add migration for SEOWorksTaskMapping table if missing"

# Push
git push

echo "Fix pushed! Render will redeploy shortly."
