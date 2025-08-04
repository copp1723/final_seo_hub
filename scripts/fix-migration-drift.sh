#!/bin/bash

# Script to fix migration drift in production database
# This creates a baseline migration from the current database state

echo "🔧 Fixing migration drift in production database..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${YELLOW}WARNING: This will create a baseline migration from the current database state.${NC}"
echo -e "${YELLOW}Make sure you have a recent backup before proceeding.${NC}"
echo ""
read -p "Do you want to continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Operation cancelled."
    exit 1
fi

# Step 1: Create a baseline migration
echo -e "${BLUE}Step 1: Creating baseline migration from current database...${NC}"
npx prisma migrate diff \
  --from-empty \
  --to-schema-datasource prisma/schema.prisma \
  --script > prisma/migrations/20250202_baseline/migration.sql

# Create migration directory
mkdir -p prisma/migrations/20250202_baseline

# Step 2: Mark the baseline migration as applied
echo -e "${BLUE}Step 2: Marking baseline migration as applied...${NC}"
npx prisma migrate resolve --applied 20250202_baseline

# Step 3: Now create the orphaned_tasks migration
echo -e "${BLUE}Step 3: Creating orphaned_tasks migration...${NC}"
npx prisma migrate dev --name add_orphaned_tasks_table --create-only

# Step 4: Apply the new migration
echo -e "${BLUE}Step 4: Applying orphaned_tasks migration...${NC}"
npx prisma migrate deploy

echo -e "${GREEN}✅ Migration drift fixed successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Verify the migrations are properly applied: npx prisma migrate status"
echo "2. Test the orphaned_tasks functionality"
echo "3. Deploy the updated code"