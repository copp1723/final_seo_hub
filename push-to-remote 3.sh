#!/bin/bash

echo "🔍 Checking Git Status and Pushing to Remote"
echo "============================================="

cd /Users/copp1723/Desktop/final_seo_hub

echo "📍 Current working directory:"
pwd

echo ""
echo "🔍 Git status:"
git status

echo ""
echo "📋 Git remotes:"
git remote -v

echo ""
echo "🌿 Current branch:"
git branch --show-current

echo ""
echo "📝 Adding all new files to git..."
git add .

echo ""
echo "📝 Checking what will be committed:"
git status --porcelain

echo ""
echo "💾 Committing changes..."
git commit -m "feat: Add fixed multi-brand dealership setup scripts

- Fixed ID collision issues in multi-brand setup
- Added upsert operations for safer database operations
- Created 22 dealerships across 4 brand agencies
- Added proper error handling and validation
- Includes handoff documentation for continuation"

echo ""
echo "🚀 Pushing to remote repository..."
git push origin $(git branch --show-current)

echo ""
echo "✅ Git push completed!"
echo ""
echo "🔗 Remote repository should now be updated with:"
echo "   - Fixed multi-brand setup script"
echo "   - All recent dealership configuration work"
echo "   - Documentation and debugging scripts"
