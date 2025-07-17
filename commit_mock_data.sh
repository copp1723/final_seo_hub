#!/bin/bash
cd /Users/copp1723/Desktop/final_seo_hub

echo "Adding dashboard with mock data..."
git add app/\(authenticated\)/dashboard/page.tsx

echo "Committing changes..."
git commit -m "Add comprehensive mock data to dashboard

- Added realistic mock data for all dashboard sections
- Stats cards now show: 3 active requests, 27 total, 18 tasks completed
- Package progress shows Premium SEO Package with realistic completion rates
- Recent activity timeline with 5 realistic entries
- All data appears immediately without API calls
- Professional looking demo data for presentations"

echo "Pushing to remote..."
git push origin main

echo "✅ Mock data dashboard committed and pushed successfully!"
