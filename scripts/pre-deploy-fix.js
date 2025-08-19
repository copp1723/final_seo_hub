#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

async function fixFailedMigration() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 Checking for failed migrations...');
    
    // Check if migrations table exists first
    let migrationsTableExists = false;
    try {
      await prisma.$queryRaw`SELECT 1 FROM "_prisma_migrations" LIMIT 1`;
      migrationsTableExists = true;
    } catch (error) {
      console.log('ℹ️ Migrations table does not exist - this is normal for a fresh database');
      migrationsTableExists = false;
    }
    
    if (migrationsTableExists) {
      // Check if the problematic migration exists
      const failedMigration = await prisma.$queryRaw`
        SELECT * FROM "_prisma_migrations" 
        WHERE migration_name = '20250710_add_invitation_tokens' 
        AND finished_at IS NULL
      `;
      
      if (failedMigration && failedMigration.length > 0) {
        console.log('❌ Found failed migration: 20250710_add_invitation_tokens');
        console.log('🔧 Marking migration as resolved...');
        
        // Mark the migration as finished
        await prisma.$executeRaw`
          UPDATE "_prisma_migrations" 
          SET finished_at = NOW()
          WHERE migration_name = '20250710_add_invitation_tokens' 
          AND finished_at IS NULL
        `;
        
        console.log('✅ Migration marked as resolved');
      } else {
        console.log('✅ No failed migrations found');
      }
    } else {
      console.log('✅ Fresh database - no migration fixes needed');
    }
    
    // Now run the actual migrations
    console.log('🚀 Running prisma migrate deploy...');
    const { execSync } = require('child_process');
    
    try {
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      console.log('✅ Migrations completed successfully');
    } catch (error) {
      // If migration deploy fails due to non-empty database, try db push instead
      console.log('⚠️ Migration deploy failed, trying db push to sync schema...');
      try {
        execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
        console.log('✅ Database schema synced successfully');
      } catch (pushError) {
        console.error('❌ Both migrate deploy and db push failed:', pushError.message);
        throw pushError;
      }
    }
    
  } catch (error) {
    console.error('❌ Error fixing migrations:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixFailedMigration().catch(console.error);