#!/bin/bash

echo "🔄 Running fixed multi-brand setup..."
echo "======================================"

cd /Users/copp1723/Desktop/final_seo_hub

# Run the fixed script
node fixed-multi-brand-setup.js

echo ""
echo "🚀 Testing the application..."
echo "============================"

# Start the dev server in background for testing
npm run dev &
DEV_PID=$!

# Wait a moment for the server to start
sleep 3

echo "✅ Development server started at http://localhost:3000"
echo "🎯 You can now test the multi-brand functionality!"
echo ""
echo "💡 To stop the dev server, run: kill $DEV_PID"
