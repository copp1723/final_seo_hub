#!/bin/bash

echo "Debugging and fixing database connection issues..."

cd /Users/copp1723/Desktop/final_seo_hub

# 1. Check if node_modules has Prisma client
echo "Checking Prisma client..."
if [ ! -d "node_modules/.prisma/client" ]; then
    echo "❌ Prisma client not found in node_modules"
    echo "Running npm install..."
    npm install
fi

# 2. Generate Prisma client
echo -e "\nRegenerating Prisma client..."
npx prisma generate

# 3. Check database connection
echo -e "\nTesting database connection..."
npx prisma db pull --print

# 4. Run any pending migrations
echo -e "\nChecking for pending migrations..."
npx prisma migrate deploy

echo -e "\n✅ Database setup complete!"
echo "If you still see errors, check:"
echo "1. DATABASE_URL in .env is correct"
echo "2. Database server is accessible"
echo "3. Run 'npm run build' to rebuild the app"
