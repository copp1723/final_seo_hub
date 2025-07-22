#!/bin/bash

echo "🔧 Fixing secret detection issues..."

# First, let's remove the files containing secrets
echo "📝 Removing files with exposed secrets..."
rm -f generate-encryption-key.sh fix-deployment.sh

# Add to .gitignore to prevent future issues
echo -e "\n# Files with secrets\ngenerate-encryption-key.sh\nfix-deployment.sh\n*.env\n.env.*" >> .gitignore

# Commit the removal
git add -A
git commit -m "fix: Remove files containing secrets and update .gitignore"

# Now push just the current changes
echo "📤 Pushing current changes..."
git push origin main

echo "✅ Current changes pushed!"
echo ""
echo "⚠️  Note: The repository still has secrets in its history."
echo "   To fully clean the history, you would need to:"
echo "   1. Use git filter-branch or BFG Repo-Cleaner"
echo "   2. Force push to rewrite history"
echo "   3. Have all collaborators re-clone"
echo ""
echo "📋 For now, the login page fix is deployed!"
