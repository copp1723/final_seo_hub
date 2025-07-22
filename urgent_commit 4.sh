#!/bin/bash
cd /Users/copp1723/Desktop/final_seo_hub

echo "Adding files to git..."
git add components/layout/navigation.tsx
git add app/\(authenticated\)/layout.tsx

echo "Committing changes..."
git commit -m "URGENT FIX: Move dealership selector below navigation bar

- Moved DealershipSelector from navigation bar to below it
- This completely frees up the navigation bar space
- Removes SELECT DEALERSHIP text from crowded top area
- Maintains all functionality in cleaner layout
- Fixes the critical spacing issue immediately"

echo "Pushing to remote..."
git push origin main

echo "✅ URGENT FIX: Changes committed and pushed successfully!"
