#!/usr/bin/env npx tsx
/**
 * Test script to verify dealershipId data flow is working correctly
 * Run with: npx tsx scripts/test-dealership-data-flow.ts
 */

import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'

async function testDealershipDataFlow() {
  logger.info('Testing dealershipId data flow...\n')

  try {
    // 1. Check user setup
    logger.info('=== USER SETUP CHECK ===')
    const users = await prisma.users.findMany({
      select: {
        id: true,
        email: true,
        dealershipId: true,
        agencyId: true,
        role: true
      }
    })

    const usersWithDealership = users.filter(u => u.dealershipId)
    const usersWithoutDealership = users.filter(u => !u.dealershipId)

    logger.info(`Total users: ${users.length}`)
    logger.info(`Users with dealership: ${usersWithDealership.length}`)
    logger.info(`Users without dealership: ${usersWithoutDealership.length}`)
    
    if (usersWithoutDealership.length > 0) {
      logger.warn('\nUsers without dealership:')
      usersWithoutDealership.forEach(u => {
        logger.warn(`  - ${u.email} (${u.role})`)
      })
    }

    // 2. Check dealership setup
    logger.info('\n=== DEALERSHIP SETUP CHECK ===')
    const dealerships = await prisma.dealerships.findMany({
      select: {
        id: true,
        name: true,
        agencyId: true
      }
    })

    logger.info(`Total dealerships: ${dealerships.length}`)
    dealerships.forEach(d => {
      logger.info(`  - ${d.name} (ID: ${d.id})`)
    })

    // 3. Check recent requests
    logger.info('\n=== RECENT REQUESTS CHECK ===')
    const recentRequests = await prisma.requests.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        users: {
          select: {
            email: true,
            dealershipId: true
          }
        }
      }
    })

    logger.info(`Recent requests (last 10):`)
    recentRequests.forEach(r => {
      const hasDealership = r.dealershipId ? '✓' : '✗'
      const userHasDealership = r.users.dealershipId ? '✓' : '✗'
      logger.info(`  - ${r.title} | Request dealership: ${hasDealership} | User dealership: ${userHasDealership}`)
      if (!r.dealershipId && r.users.dealershipId) {
        logger.warn(`    -> Request missing dealership but user has one: ${r.users.dealershipId}`)
      }
    })

    // 4. Check orphaned tasks
    logger.info('\n=== ORPHANED TASKS CHECK ===')
    try {
      const orphanedTasks = await prisma.orphaned_tasks.findMany({
        where: { processed: false }
      })

      logger.info(`Unprocessed orphaned tasks: ${orphanedTasks.length}`)
      if (orphanedTasks.length > 0) {
        logger.warn('Run process-orphaned-tasks endpoint to process these')
        orphanedTasks.slice(0, 5).forEach(t => {
          logger.info(`  - ${t.taskType} for ${t.clientEmail || t.clientId || 'unknown'}`)
        })
      }
    } catch (orphanError) {
      logger.info('Orphaned tasks table not available or not migrated yet')
      logger.info('This is expected if you haven\'t run the latest migrations')
    }

    // 5. Statistics summary
    logger.info('\n=== STATISTICS SUMMARY ===')
    const stats = {
      requests: {
        total: await prisma.requests.count(),
        withDealership: await prisma.requests.count({ where: { dealershipId: { not: null } } })
      },
      tasks: {
        total: await prisma.tasks.count(),
        withDealership: await prisma.tasks.count({ where: { dealershipId: { not: null } } })
      },
      users: {
        total: await prisma.users.count(),
        withDealership: await prisma.users.count({ where: { dealershipId: { not: null } } })
      }
    }

    const requestPct = stats.requests.total > 0 ? Math.round(stats.requests.withDealership / stats.requests.total * 100) : 0
    const taskPct = stats.tasks.total > 0 ? Math.round(stats.tasks.withDealership / stats.tasks.total * 100) : 0
    const userPct = stats.users.total > 0 ? Math.round(stats.users.withDealership / stats.users.total * 100) : 0
    
    logger.info(`Requests: ${stats.requests.withDealership}/${stats.requests.total} (${requestPct}%) have dealershipId`)
    logger.info(`Tasks: ${stats.tasks.withDealership}/${stats.tasks.total} (${taskPct}%) have dealershipId`)
    logger.info(`Users: ${stats.users.withDealership}/${stats.users.total} (${userPct}%) have dealershipId`)

    // 6. Test recommendations
    logger.info('\n=== RECOMMENDATIONS ===')
    if (stats.requests.withDealership < stats.requests.total) {
      logger.warn('1. Run fix-missing-dealership-ids.ts to fix existing data')
    }
    if (usersWithoutDealership.length > 0) {
      logger.warn('2. Assign dealerships to users without them')
    }
    logger.info('3. Deploy the updated code with dealershipId fixes')
    
    // 7. Quick validation for a test user
    if (usersWithDealership.length > 0) {
      const testUser = usersWithDealership[0]
      logger.info(`\n=== TESTING USER: ${testUser.email} ===`)
      
      const userRequests = await prisma.requests.findMany({
        where: { userId: testUser.id },
        take: 5,
        orderBy: { createdAt: 'desc' }
      })

      logger.info(`User has ${userRequests.length} recent requests`)
      userRequests.forEach(r => {
        const match = r.dealershipId === testUser.dealershipId ? '✓' : '✗'
        logger.info(`  - ${r.title} | Dealership match: ${match}`)
      })
    }

  } catch (error) {
    logger.error('Error testing dealership data flow:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
testDealershipDataFlow()
  .then(() => {
    logger.info('\nTest completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    logger.error('Test failed:', error)
    process.exit(1)
  })
