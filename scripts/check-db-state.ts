#!/usr/bin/env npx tsx
/**
 * Quick script to check database state and Prisma client
 * Run with: npx tsx scripts/check-db-state.ts
 */

import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'

async function checkDatabaseState() {
  logger.info('Checking database state...\n')

  try {
    // Check if we can connect
    await prisma.$connect()
    logger.info('✓ Database connection successful')

    // Check basic tables
    const tables = [
      'users',
      'dealerships', 
      'requests',
      'tasks',
      'orphaned_tasks'
    ]

    for (const table of tables) {
      try {
        const count = await (prisma as any)[table].count()
        logger.info(`✓ Table '${table}' exists with ${count} records`)
      } catch (e) {
        logger.warn(`✗ Table '${table}' not accessible - may need migration`)
      }
    }

    // Get some basic stats
    logger.info('\n=== Quick Stats ===')
    
    const userCount = await prisma.users.count()
    const dealershipCount = await prisma.dealerships.count()
    const requestCount = await prisma.requests.count()
    
    logger.info(`Users: ${userCount}`)
    logger.info(`Dealerships: ${dealershipCount}`)
    logger.info(`Requests: ${requestCount}`)

    // Check if migrations are needed
    logger.info('\n=== Migration Check ===')
    logger.info('If orphaned_tasks table is not accessible, run:')
    logger.info('  npx prisma migrate deploy')
    logger.info('  npx prisma generate')

  } catch (error) {
    logger.error('Database check failed:', error)
    logger.info('\nTroubleshooting steps:')
    logger.info('1. Check DATABASE_URL environment variable')
    logger.info('2. Run: npx prisma generate')
    logger.info('3. Run: npx prisma migrate deploy')
  } finally {
    await prisma.$disconnect()
  }
}

// Run the check
checkDatabaseState()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    logger.error('Check failed:', error)
    process.exit(1)
  })
