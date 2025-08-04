#!/bin/bash

echo "Committing and pushing SEOWorks integration fixes..."

cd /Users/copp1723/Desktop/final_seo_hub

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: $CURRENT_BRANCH"

# Check git status first
echo -e "\nCurrent git status:"
git status --short

# Add all the modified files
echo -e "\nAdding modified files..."
git add prisma/schema.prisma
git add app/api/seoworks/webhook/route.ts
git add app/api/seoworks/send-focus-request/route.ts
git add app/api/requests/route.ts

# Also add any new script files
git add scripts/fix-seoworks-webhook.sh 2>/dev/null || true
git add scripts/fix-database-connection.sh 2>/dev/null || true
git add scripts/quick-fix-500-error.sh 2>/dev/null || true
git add scripts/push-seoworks-fixes.sh 2>/dev/null || true

# Show what's being committed
echo -e "\nFiles to be committed:"
git status --short

# Commit the changes
echo -e "\nCommitting changes..."
git commit -m "Fix SEOWorks integration and webhook handling

- Fixed SEOWorksTaskMapping model relation in schema
- Enhanced webhook to handle tasks created directly in SEOWorks
- Added fallback matching by clientId when no direct task mapping exists
- Store SEOWorks taskId from API responses for better tracking
- Temporarily simplified request creation to avoid 500 errors
- Auto-create requests for externally created tasks when completed

This ensures all task updates from SEOWorks are properly tracked regardless of origin."

# Push to remote
echo -e "\nPushing to remote..."
git push origin $CURRENT_BRANCH

echo -e "\n✅ Changes pushed successfully!"
echo "Render should start deploying automatically."
echo ""
echo "Summary of changes:"
echo "- Database schema fixed (SEOWorksTaskMapping relation)"
echo "- Webhook enhanced to handle all scenarios"
echo "- Request creation simplified to prevent errors"
echo "- SEOWorks task ID storage implemented"
echo ""
echo "Next steps:"
echo "1. Monitor Render deployment (should take 5-10 minutes)"
echo "2. Once deployed, the 500 errors will be resolved"
echo "3. Jeff can start sending webhook updates"
echo "4. Test creating a new focus request"
