#!/bin/bash

echo "� Database Setup Script"
echo "======================="

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo "�️  Generating Prisma Client..."
npx prisma generate

echo "🔍 Checking current database state..."
npx prisma db pull

echo "� Creating migration if schema differs..."
npx prisma migrate dev --name initial_setup --create-only

echo "🚀 Applying migrations to database..."
npx prisma migrate deploy

echo "✅ Database setup complete!"
echo ""
echo "📊 Current migration status:"
npx prisma migrate status

echo ""
echo "🔍 Verifying enum types..."
npx prisma db execute --stdin <<EOF
SELECT n.nspname as schema, t.typname as enum_name
FROM pg_type t
JOIN pg_namespace n ON t.typnamespace = n.oid
WHERE t.typtype = 'e'
AND n.nspname = 'public';
EOF 