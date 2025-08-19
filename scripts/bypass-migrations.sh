#!/bin/bash

echo "🔧 Bypassing Prisma migrations and pushing schema directly..."

# Generate Prisma client
echo "📦 Generating Prisma client..."
npx prisma generate

# Push the schema to the database without migrations
echo "🚀 Pushing schema to database..."
npx prisma db push --skip-generate --accept-data-loss

echo "✅ Schema sync complete!"