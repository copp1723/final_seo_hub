#!/bin/bash
cd /Users/copp1723/Desktop/final_seo_hub

echo "Adding reporting page with mock integrations..."
git add app/\(authenticated\)/reporting/page.tsx

echo "Committing changes..."
git commit -m "Add mock GA4 and Search Console integrations to reporting page

- Added mock GA4 properties: Jay Hatfield Chevrolet and Acura of Columbus  
- Added mock Search Console sites: jayhatfieldfordsarcoxie.com and acuraofcolumbus.com
- Properties now appear in dropdowns immediately
- Auto-sync functionality works with mock data
- Matches the connected integrations shown in settings
- Quick demo-ready solution without API dependencies"

echo "Pushing to remote..."
git push origin main

echo "✅ Mock integrations added to reporting page successfully!"
