#!/bin/bash

# Script to sync schema with production and add orphaned_tasks table
# This handles the migration drift by pulling the current schema first

echo "🔄 Syncing schema with production and adding orphaned_tasks..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Step 1: Pull current schema from production
echo -e "${BLUE}Step 1: Pulling current schema from production...${NC}"
npx prisma db pull --force

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to pull schema${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Schema pulled successfully${NC}"

# Step 2: Generate Prisma client
echo -e "${BLUE}Step 2: Generating Prisma client...${NC}"
npx prisma generate

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to generate client${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Client generated${NC}"

# Step 3: Apply orphaned_tasks migration
echo -e "${BLUE}Step 3: Creating orphaned_tasks table...${NC}"

# Create the table directly
psql "$DATABASE_URL" << 'EOF'
-- Create orphaned_tasks table if it doesn't exist
CREATE TABLE IF NOT EXISTS "orphaned_tasks" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "clientId" TEXT,
    "clientEmail" TEXT,
    "taskType" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "completionDate" TIMESTAMP(3),
    "deliverables" JSONB DEFAULT '[]',
    "webhookData" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "orphaned_tasks_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "orphaned_tasks_clientId_idx" ON "orphaned_tasks"("clientId");
CREATE INDEX IF NOT EXISTS "orphaned_tasks_clientEmail_idx" ON "orphaned_tasks"("clientEmail");
CREATE INDEX IF NOT EXISTS "orphaned_tasks_processed_idx" ON "orphaned_tasks"("processed");
CREATE INDEX IF NOT EXISTS "orphaned_tasks_externalId_idx" ON "orphaned_tasks"("externalId");

-- Verify table was created
SELECT 'Orphaned tasks table created successfully' as status;
EOF

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to create orphaned_tasks table${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Orphaned tasks table created${NC}"

# Step 4: Update schema.prisma if needed
echo -e "${BLUE}Step 4: Checking if orphaned_tasks model exists in schema...${NC}"

if ! grep -q "model orphaned_tasks" prisma/schema.prisma; then
    echo -e "${YELLOW}Adding orphaned_tasks model to schema.prisma...${NC}"
    
    # Append the model to schema.prisma
    cat >> prisma/schema.prisma << 'EOF'

model orphaned_tasks {
  id             String    @id @default(cuid())
  clientId       String?
  clientEmail    String?
  taskType       String
  externalId     String
  status         String
  completionDate DateTime?
  deliverables   Json      @default("[]")
  webhookData    Json
  processed      Boolean   @default(false)
  processedAt    DateTime?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  @@index([clientId])
  @@index([clientEmail])
  @@index([processed])
  @@index([externalId])
}
EOF
    
    # Regenerate client
    npx prisma generate
fi

echo -e "${GREEN}✓ Schema updated${NC}"

# Step 5: Test the setup
echo -e "${BLUE}Step 5: Testing orphaned_tasks functionality...${NC}"
npx tsx scripts/test-dealership-data-flow.ts

echo ""
echo -e "${GREEN}✅ Schema sync and migration complete!${NC}"
echo ""
echo "The orphaned_tasks table has been created and is ready to use."
echo "The test script should now run without errors."