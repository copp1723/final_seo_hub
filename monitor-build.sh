#!/bin/bash

echo "🔍 Monitoring build progress..."
echo "This may take a few minutes..."
echo ""

# Function to check if build is complete
check_build_status() {
    if [ -f ".next/BUILD_ID" ]; then
        echo "✅ Build completed successfully!"
        return 0
    else
        return 1
    fi
}

# Wait for build to complete or fail
while true; do
    if pgrep -f "next build" > /dev/null; then
        echo -n "."
        sleep 5
    else
        echo ""
        break
    fi
done

# Check if build succeeded
if check_build_status; then
    echo ""
    echo "✅ Build successful!"
    echo ""
    echo "📊 Build summary:"
    if [ -f ".next/BUILD_ID" ]; then
        echo "Build ID: $(cat .next/BUILD_ID)"
    fi
    echo ""
    echo "🚀 Ready to deploy! Run these commands:"
    echo ""
    echo "git add -A"
    echo "git commit -m 'Fix deployment: Update Mailgun validation and make API routes dynamic'"
    echo "git push origin main"
    echo ""
    echo "Your changes include:"
    echo "- Fixed Mailgun API key validation (removed key- prefix requirement)"
    echo "- Added dynamic rendering to all API routes"
    echo "- Prevented static generation errors during build"
else
    echo ""
    echo "⚠️  Build may have failed or was interrupted"
    echo ""
    echo "To check the current status:"
    echo "1. Look for any error messages above"
    echo "2. Try running: npm run build"
    echo ""
    echo "If the build succeeded but this script didn't detect it,"
    echo "you can still deploy with:"
    echo ""
    echo "git add -A"
    echo "git commit -m 'Fix deployment: Update Mailgun validation and make API routes dynamic'"
    echo "git push origin main"
fi
