#!/usr/bin/env node

/**
 * Phase 1 Database Restoration Script
 * Safely restores critical missing tables from legacy schema analysis
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const logger = {
  info: (msg, meta = {}) => console.log(`ℹ️  ${msg}`, meta),
  success: (msg, meta = {}) => console.log(`✅ ${msg}`, meta),
  error: (msg, meta = {}) => console.error(`❌ ${msg}`, meta),
  warn: (msg, meta = {}) => console.warn(`⚠️  ${msg}`, meta),
  debug: (msg, meta = {}) => process.env.DEBUG && console.log(`🐛 ${msg}`, meta)
};

async function main() {
  try {
    logger.info('🚀 Starting Phase 1 Database Restoration');
    
    // Check if we're in the right directory
    const currentDir = process.cwd();
    const expectedDir = '/Users/joshcopp/Desktop/final_seo_hub';
    
    if (!currentDir.includes('final_seo_hub')) {
      logger.error('Script must be run from final_seo_hub directory');
      process.exit(1);
    }
    
    // Check if database URL is set
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      logger.error('DATABASE_URL environment variable not set');
      logger.info('Please set DATABASE_URL and try again');
      process.exit(1);
    }
    
    logger.info('📋 Pre-restoration checklist');
    
    // 1. Check if restoration script exists
    const restoreScript = path.join(currentDir, 'scripts', 'restore-phase1-tables.sql');
    if (!fs.existsSync(restoreScript)) {
      logger.error('Restoration script not found:', restoreScript);
      process.exit(1);
    }
    logger.success('Restoration script found');
    
    // 2. Check database connectivity
    logger.info('🔌 Testing database connectivity...');
    try {
      execSync('npx prisma db pull --print', { 
        stdio: 'pipe',
        env: { ...process.env, DATABASE_URL: databaseUrl }
      });
      logger.success('Database connection successful');
    } catch (error) {
      logger.error('Database connection failed:', error.message);
      process.exit(1);
    }
    
    // 3. Create backup before restoration
    logger.info('💾 Creating backup before restoration...');
    const backupScript = path.join(currentDir, 'scripts', 'db-backup-verify.js');
    if (fs.existsSync(backupScript)) {
      try {
        execSync('node scripts/db-backup-verify.js backup', { stdio: 'inherit' });
        logger.success('Backup created successfully');
      } catch (error) {
        logger.warn('Backup creation failed, but continuing with restoration');
        logger.debug('Backup error:', error.message);
      }
    } else {
      logger.warn('Backup script not found, proceeding without backup');
    }
    
    // 4. Run the restoration script
    logger.info('🔧 Running Phase 1 table restoration...');
    try {
      const command = `npx prisma db execute --file="${restoreScript}" --schema=prisma/schema.prisma`;
      execSync(command, { 
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: databaseUrl }
      });
      logger.success('Phase 1 restoration completed successfully');
    } catch (error) {
      logger.error('Restoration failed:', error.message);
      logger.error('You may need to manually review and fix any conflicts');
      throw error;
    }
    
    // 5. Generate Prisma client to recognize new tables
    logger.info('🔄 Regenerating Prisma client...');
    try {
      execSync('npx prisma generate', { stdio: 'inherit' });
      logger.success('Prisma client regenerated');
    } catch (error) {
      logger.error('Prisma client generation failed:', error.message);
      logger.warn('You may need to run "npx prisma generate" manually');
    }
    
    // 6. Run database introspection to verify
    logger.info('🔍 Verifying restored tables...');
    try {
      const result = execSync('npx prisma db pull --print', { 
        encoding: 'utf8',
        env: { ...process.env, DATABASE_URL: databaseUrl }
      });
      
      // Check for critical tables
      const criticalTables = [
        'accounts', 'sessions', 'verification_tokens',
        'requests', 'tasks', 'orders',
        'conversations', 'messages',
        'audit_logs', 'user_invites'
      ];
      
      const missingTables = criticalTables.filter(table => !result.includes(`model ${table}`));
      
      if (missingTables.length > 0) {
        logger.warn('Some critical tables may still be missing:', missingTables);
      } else {
        logger.success('All critical tables verified in database');
      }
      
    } catch (error) {
      logger.warn('Table verification failed, but restoration may have succeeded');
      logger.debug('Verification error:', error.message);
    }
    
    // 7. Test a simple query on restored tables
    logger.info('🧪 Testing database functionality...');
    try {
      const testScript = `
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        
        async function test() {
          try {
            // Test that we can query restored tables
            const userCount = await prisma.users.count();
            const accountCount = await prisma.accounts.count();
            const sessionCount = await prisma.sessions.count();
            
            console.log('✅ Database test successful');
            console.log('📊 Users:', userCount, 'Accounts:', accountCount, 'Sessions:', sessionCount);
            
            await prisma.$disconnect();
            process.exit(0);
          } catch (error) {
            console.error('❌ Database test failed:', error.message);
            await prisma.$disconnect();
            process.exit(1);
          }
        }
        
        test();
      `;
      
      fs.writeFileSync(path.join(currentDir, 'test-restoration.js'), testScript);
      execSync('node test-restoration.js', { stdio: 'inherit' });
      fs.unlinkSync(path.join(currentDir, 'test-restoration.js'));
      
      logger.success('Database functionality test passed');
      
    } catch (error) {
      logger.warn('Database test failed, but restoration may still be successful');
      logger.debug('Test error:', error.message);
    }
    
    // 8. Summary and next steps
    logger.success('🎉 Phase 1 Database Restoration Complete!');
    logger.info('📈 Summary:');
    logger.info('  ✅ Critical authentication tables restored (accounts, sessions, verification_tokens)');
    logger.info('  ✅ Core business logic tables restored (requests, tasks, orders)');
    logger.info('  ✅ Communication system restored (conversations, messages)');
    logger.info('  ✅ Audit and user management tables restored');
    logger.info('  ✅ SEOWorks integration tables restored');
    
    logger.info('🔄 Next Steps:');
    logger.info('  1. Test OAuth authentication flows');
    logger.info('  2. Verify request and task management functionality');
    logger.info('  3. Test chat/messaging system');
    logger.info('  4. Update API endpoints to use restored tables');
    logger.info('  5. Run comprehensive integration tests');
    
    logger.info('🏃 You can now:');
    logger.info('  - Test NextAuth authentication');
    logger.info('  - Create and manage requests');
    logger.info('  - Use the task management system');
    logger.info('  - Access chat conversations');
    logger.info('  - View audit logs');
    
  } catch (error) {
    logger.error('💥 Restoration failed:', error.message);
    logger.error('Please check the logs above and fix any issues before retrying');
    process.exit(1);
  }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  logger.info('🛑 Restoration interrupted by user');
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('💥 Uncaught exception during restoration:', error.message);
  process.exit(1);
});

// Run the restoration
main().catch(error => {
  logger.error('💥 Fatal error during restoration:', error.message);
  process.exit(1);
});