#!/usr/bin/env node

/**
 * Emergency deployment script for SEOWorks migration
 * This script applies the missing database migration to fix production
 */

const { execSync } = require('child_process');

console.log('🚀 Deploying SEOWorks migration to fix production database...');

try {
  // Generate Prisma client first
  console.log('📦 Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  // Deploy pending migrations
  console.log('🗄️  Deploying database migrations...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  
  console.log('✅ SEOWorks migration deployed successfully!');
  console.log('');
  console.log('The following changes have been applied:');
  console.log('- Added seoworksTaskId column to Request table');
  console.log('- Created SEOWorksTaskMapping table');
  console.log('- Added necessary indexes for performance');
  console.log('');
  console.log('Production should now be working correctly.');
  
} catch (error) {
  console.error('❌ Migration deployment failed:', error.message);
  console.error('');
  console.error('Manual steps to fix production:');
  console.error('1. Connect to production database');
  console.error('2. Run the SQL from: prisma/migrations/20250103_add_seoworks_mapping/migration.sql');
  console.error('3. Restart the application');
  process.exit(1);
}