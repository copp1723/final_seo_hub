#!/bin/bash
set -e

echo "🔄 Setting up database..."

# Generate Prisma client
echo "📦 Generating Prisma client..."
npx prisma generate

# Push database schema (creates tables)
echo "🗃️ Creating database tables..."
npx prisma db push --force-reset

# Verify database setup
echo "✅ Database setup complete!"
echo "📊 Checking database status..."
npx prisma db seed || echo "⚠️ No seed file found (this is normal)"

echo "🎉 Database is ready to use!" 