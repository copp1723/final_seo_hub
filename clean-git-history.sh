#!/bin/bash

echo "🧹 Cleaning secrets from Git history..."

# Install BFG if not already installed (macOS)
if ! command -v bfg &> /dev/null; then
    echo "📦 Installing BFG Repo-Cleaner..."
    brew install bfg
fi

# Create a backup first
echo "💾 Creating backup..."
cp -r .git .git.backup

# Remove the specific files from history
echo "🔍 Removing secret-containing files from history..."
bfg --delete-files generate-encryption-key.sh
bfg --delete-files fix-deployment.sh

# Clean up
git reflog expire --expire=now --all && git gc --prune=now --aggressive

# Force push
echo "📤 Force pushing cleaned history..."
git push origin main --force

echo "✅ History cleaned and pushed!"
echo ""
echo "⚠️  All team members need to re-clone the repository!"
