#!/bin/bash
cd /Users/copp1723/Desktop/final_seo_hub
git add components/layout/navigation.tsx
git commit -m "Navigation layout optimization: consolidate requests tabs to free up space

- Merged 'My Requests' and 'New Request' into single 'Requests' tab
- Moved Admin section further left for better spacing  
- Updated active state logic to handle both /requests and /focus-request routes
- Maintains all existing functionality while improving UI space"
git push origin main
echo "Changes committed and pushed successfully!"
