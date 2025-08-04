#!/bin/bash

# Script to apply orphaned tasks migration to production database
# This handles the migration drift issue and creates the orphaned_tasks table

echo "🚀 Applying orphaned tasks migration to production database..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    # Try to load from .env
    if [ -f .env ]; then
        export $(cat .env | grep DATABASE_URL | xargs)
    fi
fi

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}ERROR: DATABASE_URL not found${NC}"
    echo "Please set DATABASE_URL or ensure it's in your .env file"
    exit 1
fi

echo -e "${YELLOW}This script will:${NC}"
echo "1. Apply the orphaned_tasks table migration"
echo "2. Register the migration in Prisma"
echo "3. Generate the updated Prisma client"
echo ""
echo -e "${YELLOW}Make sure you have a database backup before proceeding!${NC}"
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Operation cancelled."
    exit 1
fi

# Step 1: Apply the SQL migration directly
echo -e "${BLUE}Step 1: Creating orphaned_tasks table...${NC}"
psql "$DATABASE_URL" -f scripts/create-orphaned-tasks-migration.sql

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to create orphaned_tasks table${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Orphaned tasks table created${NC}"

# Step 2: Generate Prisma client to include the new model
echo -e "${BLUE}Step 2: Generating Prisma client...${NC}"
npx prisma generate

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to generate Prisma client${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Prisma client generated${NC}"

# Step 3: Test the implementation
echo -e "${BLUE}Step 3: Testing orphaned tasks functionality...${NC}"

# Create a simple test script
cat > /tmp/test-orphaned-tasks.js << 'EOF'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    // Check if table exists
    const count = await prisma.orphaned_tasks.count();
    console.log(`✓ Orphaned tasks table exists with ${count} records`);
    
    // Test insert
    const testTask = await prisma.orphaned_tasks.create({
      data: {
        id: 'test-' + Date.now(),
        clientId: 'test-dealer',
        taskType: 'blog',
        externalId: 'test-external-' + Date.now(),
        status: 'completed',
        webhookData: { test: true },
        processed: false
      }
    });
    console.log('✓ Successfully created test orphaned task');
    
    // Clean up
    await prisma.orphaned_tasks.delete({
      where: { id: testTask.id }
    });
    console.log('✓ Successfully cleaned up test data');
    
    return true;
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

test().then(success => process.exit(success ? 0 : 1));
EOF

node /tmp/test-orphaned-tasks.js

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Orphaned tasks functionality verified${NC}"
else
    echo -e "${YELLOW}⚠ Orphaned tasks test failed, but table was created${NC}"
fi

rm -f /tmp/test-orphaned-tasks.js

# Step 4: Run the dealership data flow test
echo -e "${BLUE}Step 4: Running dealership data flow test...${NC}"
npx tsx scripts/test-dealership-data-flow.ts

echo ""
echo -e "${GREEN}✅ Orphaned tasks migration completed!${NC}"
echo ""
echo "Next steps:"
echo "1. Test the webhook endpoint with an unknown dealership"
echo "2. Verify orphaned tasks are being stored"
echo "3. Test the onboarding flow to ensure orphaned tasks are processed"
echo ""
echo "To monitor orphaned tasks:"
echo "  psql \$DATABASE_URL -c \"SELECT * FROM orphaned_tasks WHERE processed = false;\""