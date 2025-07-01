#!/bin/bash

echo "🚨 Production Database Fix Script"
echo "================================="
echo "This script will fix the missing enum types in production"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    exit 1
fi

echo "🔧 Step 1: Creating missing enum types..."
npx prisma db execute --stdin <<'EOF'
-- Create UserRole enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserRole') THEN
        CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN');
    END IF;
END$$;

-- Create RequestStatus enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RequestStatus') THEN
        CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
    END IF;
END$$;

-- Create RequestPriority enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RequestPriority') THEN
        CREATE TYPE "RequestPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');
    END IF;
END$$;

-- Create PackageType enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PackageType') THEN
        CREATE TYPE "PackageType" AS ENUM ('SILVER', 'GOLD', 'PLATINUM');
    END IF;
END$$;
EOF

echo "✅ Enums created successfully"
echo ""

echo "🔧 Step 2: Generating Prisma Client..."
npx prisma generate

echo ""
echo "🔧 Step 3: Creating initial migration from current schema..."
mkdir -p prisma/migrations
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/20240101000000_initial_schema/migration.sql

echo ""
echo "🔧 Step 4: Applying migrations..."
npx prisma migrate deploy

echo ""
echo "✅ Production database fix complete!"
echo ""
echo "📊 Verification:"
echo "==============="
echo "Enum types in database:"
npx prisma db execute --stdin <<EOF
SELECT t.typname as enum_name, 
       array_agg(e.enumlabel ORDER BY e.enumsortorder) as values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typtype = 'e' AND t.typname IN ('UserRole', 'RequestStatus', 'RequestPriority', 'PackageType')
GROUP BY t.typname;
EOF