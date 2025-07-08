#!/bin/bash

echo "Quick fixes for the 500 error..."

cd /Users/copp1723/Desktop/final_seo_hub

# 1. Generate Prisma Client
echo "1. Regenerating Prisma client..."
npx prisma generate

# 2. Check if the issue is with build
echo -e "\n2. Building the application..."
npm run build

# 3. If running in dev mode, restart
echo -e "\n3. Restart your development server:"
echo "   - Press Ctrl+C to stop the current server"
echo "   - Run: npm run dev"

echo -e "\n4. If the issue persists, check the server logs for detailed error messages"

# 5. Test database connection directly
echo -e "\n5. Testing database connection..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$connect()
  .then(() => {
    console.log('✅ Database connection successful!');
    return prisma.user.count();
  })
  .then(count => {
    console.log(\`Found \${count} users in database\`);
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  });
"
