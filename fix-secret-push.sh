#!/bin/bash

echo "🔒 Fixing GitHub Secret Detection Issues"
echo "======================================="

# The problematic files that contain secrets
echo "📝 Removing files with exposed secrets..."

# Reset to the previous commit (before the one with secrets)
git reset --soft HEAD~1

# Remove the problematic files from staging
git rm -f generate-encryption-key.sh
git rm -f fix-deployment.sh

echo ""
echo "✅ Removed files containing secrets"
echo ""
echo "📦 Re-committing without sensitive files..."

# Add everything except the problematic files
git add -A
git commit -m "Fix deployment: Update Mailgun validation and make API routes dynamic

- Updated env-validation.ts to remove key- prefix requirement for Mailgun
- Added export const dynamic = 'force-dynamic' to all API routes
- Removed files containing sensitive information"

echo ""
echo "🚀 Ready to push!"
echo ""
echo "Run: git push origin main"
