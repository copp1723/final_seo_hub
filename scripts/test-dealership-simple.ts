#!/usr/bin/env npx tsx
/**
 * Simplified test to check dealershipId issues
 * Run with: npx tsx scripts/test-dealership-simple.ts
 */

import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'

async function testDealershipSimple() {
  logger.info('Running simplified dealershipId test...\n')

  try {
    // 1. Find requests without dealershipId
    const requestsWithoutDealership = await prisma.requests.findMany({
      where: { dealershipId: null },
      include: { 
        users: {
          select: {
            email: true,
            dealershipId: true
          }
        }
      }
    })

    if (requestsWithoutDealership.length === 0) {
      logger.info('✅ All requests have dealershipId assigned!')
    } else {
      logger.warn(`❌ Found ${requestsWithoutDealership.length} requests without dealershipId:`)
      
      requestsWithoutDealership.forEach(r => {
        if (r.users.dealershipId) {
          logger.error(`   - "${r.title}" (ID: ${r.id}) - User HAS dealership: ${r.users.dealershipId}`)
          logger.info(`     -> This can be fixed by running: npx tsx scripts/fix-missing-dealership-ids.ts`)
        } else {
          logger.warn(`   - "${r.title}" (ID: ${r.id}) - User ${r.users.email} has NO dealership`)
          logger.info(`     -> User needs dealership assignment first`)
        }
      })
    }

    // 2. Find users without dealership
    const usersWithoutDealership = await prisma.users.findMany({
      where: { 
        dealershipId: null,
        role: { not: 'SUPER_ADMIN' } // Super admins may not need dealerships
      },
      select: {
        id: true,
        email: true,
        role: true,
        _count: {
          select: { requests: true }
        }
      }
    })

    if (usersWithoutDealership.length > 0) {
      logger.warn(`\n❌ Found ${usersWithoutDealership.length} users without dealership:`)
      usersWithoutDealership.forEach(u => {
        logger.warn(`   - ${u.email} (${u.role}) - ${u._count.requests} requests`)
      })
    }

    // 3. Summary
    const stats = {
      totalRequests: await prisma.requests.count(),
      requestsWithDealership: await prisma.requests.count({ where: { dealershipId: { not: null } } }),
      totalUsers: await prisma.users.count({ where: { role: { not: 'SUPER_ADMIN' } } }),
      usersWithDealership: await prisma.users.count({ where: { dealershipId: { not: null }, role: { not: 'SUPER_ADMIN' } } })
    }

    logger.info('\n=== SUMMARY ===')
    logger.info(`Requests: ${stats.requestsWithDealership}/${stats.totalRequests} have dealershipId`)
    logger.info(`Users: ${stats.usersWithDealership}/${stats.totalUsers} have dealership (excluding SUPER_ADMIN)`)

    if (stats.requestsWithDealership < stats.totalRequests) {
      logger.info('\n📋 Next Steps:')
      logger.info('1. Run: npx tsx scripts/fix-missing-dealership-ids.ts')
      logger.info('2. Deploy the code changes to prevent future issues')
      logger.info('3. Assign dealerships to users who need them')
    } else {
      logger.info('\n✅ All requests have proper dealershipId assignment!')
    }

  } catch (error) {
    logger.error('Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
testDealershipSimple()
