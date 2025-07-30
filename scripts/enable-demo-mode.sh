#!/bin/bash

# Enable Demo Mode for SEO Hub Presentations
# This script quickly enables demo mode with clean sample data

echo "🎭 Enabling Demo Mode for SEO Hub..."

# Check if .env.local exists, create if not
if [ ! -f .env.local ]; then
    echo "Creating .env.local file..."
    touch .env.local
fi

# Remove any existing DEMO_MODE entries
sed -i '' '/DEMO_MODE/d' .env.local 2>/dev/null || sed -i '/DEMO_MODE/d' .env.local

# Add demo mode variables
echo "" >> .env.local
echo "# Demo Mode - Enabled for presentation" >> .env.local
echo "DEMO_MODE=true" >> .env.local
echo "NEXT_PUBLIC_DEMO_MODE=true" >> .env.local

echo "✅ Demo Mode ENABLED!"
echo ""
echo "🚀 Start your application with:"
echo "   npm run dev"
echo ""
echo "📊 Your dashboard will now show:"
echo "   • Clean, impressive metrics"
echo "   • Professional sample data"
echo "   • Demo banner indicator"
echo ""
echo "🔄 To disable demo mode, run: ./scripts/disable-demo-mode.sh" 