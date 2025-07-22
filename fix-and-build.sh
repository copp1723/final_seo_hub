#!/bin/bash

echo "🛑 Stopping any stalled builds..."
# Kill any hanging Next.js build processes
pkill -f "next build" 2>/dev/null || true

echo ""
echo "🧹 Cleaning up..."
# Remove build artifacts
rm -rf .next
rm -rf node_modules/.cache
rm -rf .vercel

# Clean up the npm error from duplicate folders
echo "🔧 Fixing npm duplicate folder issues..."
find node_modules -name "*argparse*" -type d -exec rm -rf {} + 2>/dev/null || true
find node_modules -name ".*-*" -type d -exec rm -rf {} + 2>/dev/null || true

echo ""
echo "📦 Reinstalling dependencies (clean install)..."
# Remove package-lock and reinstall
rm -f package-lock.json
npm install

echo ""
echo "🔨 Running build with verbose output..."
# Run build with more output
NODE_OPTIONS="--max-old-space-size=4096" npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build successful!"
    echo ""
    echo "📌 Next steps to deploy:"
    echo "1. git add -A"
    echo "2. git commit -m 'Fix deployment: Update Mailgun validation and make API routes dynamic'"
    echo "3. git push origin main"
else
    echo ""
    echo "❌ Build failed. Check the errors above."
    echo ""
    echo "Common fixes:"
    echo "1. Check for syntax errors in the modified files"
    echo "2. Ensure all environment variables are set"
    echo "3. Try running: npm run dev (to see if it starts in dev mode)"
fi
