#!/bin/bash

echo "Checking build status..."

# Check if there's a running node process for the build
if pgrep -f "next build" > /dev/null; then
    echo "🔨 Build is still running..."
    echo "Wait for it to complete, or if it's stuck, you can:"
    echo "1. Press Ctrl+C to stop it"
    echo "2. Run: npm run build"
else
    echo "✅ No active build process found"
    echo ""
    echo "To continue with deployment:"
    echo "1. Run the build manually: npm run build"
    echo "2. If build succeeds, commit and push:"
    echo "   git add -A"
    echo "   git commit -m 'Fix deployment: Update Mailgun validation and make API routes dynamic'"
    echo "   git push origin main"
fi

# Check if .next directory exists (indicates a previous build)
if [ -d ".next" ]; then
    echo ""
    echo "📁 Build output directory exists (.next)"
    # Get the last modified time
    echo "Last modified: $(date -r .next)"
fi
