#!/bin/bash

echo "🚀 Completing the rebase and push..."

# Continue the rebase (without the incorrect --no-edit flag)
echo "📝 Continuing rebase..."
git rebase --continue

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Rebase completed successfully!"
    echo ""
    echo "📤 Now pushing to remote..."
    git push origin main
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "🎉 SUCCESS! All changes have been pushed!"
        echo ""
        echo "✅ Summary of deployed fixes:"
        echo "- Dynamic rendering enabled for all API routes"
        echo "- Simplified GA4/Search Console connection logic"
        echo "- Fixed token expiration handling"
        echo "- Consolidated duplicate routes"
        echo "- Improved error messages"
        echo ""
        echo "🚀 Your data consistency issues should now be resolved!"
        echo "📊 GA4 and Search Console data should load reliably on dashboard and reporting pages"
    else
        echo "❌ Push failed. Checking status..."
        git status
        echo ""
        echo "Try: git push origin main --force-with-lease"
    fi
else
    echo "❌ Rebase failed. Current status:"
    git status
fi
