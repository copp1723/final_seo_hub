#!/bin/bash

echo "🚗 Jay Hatfield Auto Group Setup Script"
echo "======================================"
echo ""

# Check if database connection works
echo "🔍 Testing database connection..."
if ! npx prisma db execute --schema=prisma/schema.prisma --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
    echo "❌ Database connection failed!"
    echo "Please check your DATABASE_URL in .env file"
    exit 1
fi
echo "✅ Database connection successful"
echo ""

# Run the Node.js setup script
echo "🏗️  Setting up dealerships and users..."
node scripts/setup-jay-hatfield-dealerships.js

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Test the dealership selector on your dashboard"
echo "2. Use the printed User IDs for SEOWorks integration"
echo "3. Login with admin@jayhatfield.com to test agency view"