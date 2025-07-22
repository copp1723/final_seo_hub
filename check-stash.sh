#!/bin/bash

echo "🔍 Checking git stash status..."

# Try to list stashes (might fail due to corruption)
echo "📋 Attempting to list stashes:"
git stash list 2>&1 || echo "❌ Could not list stashes (corrupted)"

echo ""
echo "📂 Checking stash references:"
ls -la .git/refs/stash 2>/dev/null || echo "No stash ref file"
ls -la .git/logs/refs/stash 2>/dev/null || echo "No stash log file"

echo ""
echo "📊 Current working directory status:"
git status --short

echo ""
echo "💡 Info: Git stash is used to temporarily save uncommitted changes."
echo "   Since you've already committed your changes, losing the stash"
echo "   shouldn't affect your GA4/Search Console fixes."

echo ""
echo "🤔 Do you want to:"
echo "1) Try to recover stash contents (might fail)"
echo "2) Clear stash and proceed with push"
echo "3) Check what files were changed in your last commit"
echo ""
echo "Enter your choice (1, 2, or 3):"
