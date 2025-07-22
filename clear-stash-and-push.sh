#!/bin/bash

echo "🧹 Clearing corrupted stash and pushing changes..."

# Clear the corrupted stash
echo "🗑️  Removing corrupted stash files..."
rm -f .git/refs/stash
rm -f .git/logs/refs/stash
echo "✅ Stash cleared"

# Fetch latest from remote
echo ""
echo "📥 Fetching latest from remote..."
git fetch origin main

# Pull with rebase to get in sync
echo ""
echo "🔄 Syncing with remote (rebase)..."
git pull origin main --rebase

# Check if rebase succeeded
if [ $? -eq 0 ]; then
    echo ""
    echo "📤 Pushing your changes..."
    git push origin main
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "🎉 Success! Your changes have been pushed!"
        echo ""
        echo "✅ Summary of what was pushed:"
        echo "- Fixed dynamic rendering for all API routes"
        echo "- Simplified GA4/Search Console connection logic"
        echo "- Improved error handling for expired tokens"
        echo "- Consolidated duplicate routes"
        echo "- Created reusable utilities"
        echo ""
        echo "🚀 Your GA4 and Search Console data consistency fixes are now live!"
    else
        echo ""
        echo "❌ Push failed. Let's try force-with-lease..."
        git push origin main --force-with-lease
        
        if [ $? -eq 0 ]; then
            echo "✅ Force push succeeded!"
        else
            echo "❌ Still having issues. Please check git status"
        fi
    fi
else
    echo ""
    echo "⚠️  Rebase encountered issues. Checking status..."
    git status
    
    echo ""
    echo "If there are conflicts:"
    echo "1. Fix the conflicted files"
    echo "2. git add <fixed-files>"
    echo "3. git rebase --continue"
    echo "4. git push origin main"
fi
