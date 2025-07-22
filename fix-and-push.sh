#!/bin/bash

echo "🔧 Fixing git issues and pushing changes..."

# First, let's fix the stash issue
echo "🗑️  Clearing corrupted stash..."
rm -f .git/refs/stash
rm -f .git/logs/refs/stash

# Check current status
echo "📊 Current git status:"
git status --short

# Fetch fresh from remote
echo "📥 Fetching from remote (fresh)..."
git fetch origin main

# Check what's different
echo "📝 Checking differences..."
git log --oneline HEAD..origin/main

# Force pull and rebase
echo "🔄 Pulling with rebase..."
git pull origin main --rebase

# If that worked, push
if [ $? -eq 0 ]; then
    echo "📤 Pushing changes..."
    git push origin main
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully pushed!"
    else
        echo "⚠️  Push still failed. Trying force push..."
        echo "Do you want to force push? (This will overwrite remote) [y/N]"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            git push origin main --force-with-lease
            echo "✅ Force pushed successfully!"
        fi
    fi
else
    echo "❌ Rebase failed. Let's check the situation..."
    git status
    echo ""
    echo "You may need to:"
    echo "1. Resolve any conflicts"
    echo "2. Run: git rebase --continue"
    echo "3. Then: git push origin main"
fi
