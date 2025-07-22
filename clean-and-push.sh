#!/bin/bash

echo "🔧 Cleaning up commits with secrets"
echo "==================================="

# First, let's check the current status
echo "📊 Current git status:"
git status --short

# Reset the last commit but keep the changes
echo ""
echo "🔄 Resetting last commit..."
git reset --soft HEAD~1

# Remove ALL files that might contain secrets
echo ""
echo "🗑️  Removing potentially sensitive files..."
git rm -f --cached generate-encryption-key.sh 2>/dev/null || true
git rm -f --cached fix-deployment.sh 2>/dev/null || true
git rm -f --cached .env 2>/dev/null || true
git rm -f --cached .env.production 2>/dev/null || true

# Create a clean generate-encryption-key script without secrets
cat > generate-encryption-key-safe.sh << 'EOF'
#!/bin/bash

# Generate new 64-character ENCRYPTION_KEY
echo "Generating new 64-character ENCRYPTION_KEY..."
NEW_ENCRYPTION_KEY=$(openssl rand -hex 32)
echo "New ENCRYPTION_KEY: $NEW_ENCRYPTION_KEY"

echo ""
echo "Please update the ENCRYPTION_KEY environment variable in Render with the value above."
echo ""
echo "Note: The MAILGUN_API_KEY validation has been fixed - it no longer requires 'key-' prefix."
EOF

# Make sure .env files are in gitignore
if ! grep -q "^\.env$" .gitignore 2>/dev/null; then
    echo ".env" >> .gitignore
fi
if ! grep -q "^\.env\.production$" .gitignore 2>/dev/null; then
    echo ".env.production" >> .gitignore
fi

# Add the safe files
echo ""
echo "📦 Adding safe files..."
git add generate-encryption-key-safe.sh
git add .gitignore

# Add all the other changes (API routes with dynamic config, env-validation fix)
git add lib/env-validation.ts
git add app/api/

# Commit with a clean message
echo ""
echo "💾 Creating clean commit..."
git commit -m "Fix deployment: Update Mailgun validation and make API routes dynamic

- Updated env-validation.ts to remove key- prefix requirement for Mailgun
- Added export const dynamic = 'force-dynamic' to all API routes
- This prevents static generation errors during build"

echo ""
echo "✅ Clean commit created!"
echo ""
echo "🚀 Now push to deploy:"
echo "git push origin main"
