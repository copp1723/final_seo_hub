#!/bin/bash

echo "🔄 Syncing with remote repository..."

# First, fetch the latest changes from remote
echo "📥 Fetching latest changes from remote..."
git fetch origin main

# Try to merge the changes
echo "🔀 Attempting to merge remote changes..."
git merge origin/main --no-edit

# If merge fails, try rebase
if [ $? -ne 0 ]; then
    echo "⚠️  Merge failed, trying rebase..."
    git rebase origin/main
fi

# Now push the changes
echo "📤 Pushing changes to remote..."
git push origin main

if [ $? -eq 0 ]; then
    echo "✅ Successfully pushed all changes!"
else
    echo "❌ Push failed. You may need to resolve conflicts manually."
    echo "Try running:"
    echo "  git pull origin main --rebase"
    echo "  # Resolve any conflicts"
    echo "  git push origin main"
fi
