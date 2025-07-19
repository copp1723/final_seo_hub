#!/bin/bash

echo "🔧 Fixing development server issues..."

cd /Users/copp1723/Desktop/final_seo_hub

# Clear Next.js cache
echo "1. Clearing Next.js cache..."
rm -rf .next
rm -rf node_modules/.cache

# Clear any temp files
echo "2. Clearing temp files..."
find . -name "*.temp" -delete 2>/dev/null || true
find . -name ".DS_Store" -delete 2>/dev/null || true

# Rebuild Prisma client
echo "3. Regenerating Prisma client..."
npx prisma generate

# Install dependencies (in case something is missing)
echo "4. Installing dependencies..."
npm install

# Try to build to check for errors
echo "5. Testing build..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful! Starting dev server..."
    npm run dev
else
    echo "❌ Build failed. Check the errors above."
    echo ""
    echo "Common fixes:"
    echo "1. Check for TypeScript errors"
    echo "2. Check for missing imports"
    echo "3. Check for syntax errors"
    echo ""
    echo "Try running: npm run build again to see detailed errors"
fi
