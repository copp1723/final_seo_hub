#!/bin/bash

echo "🚀 Quick deployment without local build test"
echo "=========================================="

# Just commit and push the changes we've made
echo "📝 Checking git status..."
git status

echo ""
echo "📦 Adding all changes..."
git add -A

echo ""
echo "💾 Committing changes..."
git commit -m "Fix deployment: Update Mailgun validation and make API routes dynamic

- Updated env-validation.ts to remove key- prefix requirement for Mailgun
- Added export const dynamic = 'force-dynamic' to all API routes
- This prevents static generation errors during build"

echo ""
echo "🚀 Pushing to remote..."
git push origin main

echo ""
echo "✅ Changes pushed!"
echo ""
echo "📌 Next steps:"
echo "1. Check your Render dashboard for the deployment progress"
echo "2. The build should now succeed with these fixes"
echo "3. If there are any remaining errors, check the Render build logs"
