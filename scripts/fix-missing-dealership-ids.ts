#!/usr/bin/env npx tsx
/**
 * Migration script to fix missing dealershipId in requests and tasks
 * Run with: npx tsx scripts/fix-missing-dealership-ids.ts
 */

import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'

async function fixMissingDealershipIds() {
  logger.info('Starting fix for missing dealershipId values...')

  try {
    // 1. Fix requests with missing dealershipId
    logger.info('Checking requests with missing dealershipId...')
    
    const requestsWithoutDealership = await prisma.requests.findMany({
      where: { dealershipId: null },
      include: { users: true }
    })

    logger.info(`Found ${requestsWithoutDealership.length} requests without dealershipId`)

    let requestsFixed = 0
    for (const request of requestsWithoutDealership) {
      if (request.users.dealershipId) {
        await prisma.requests.update({
          where: { id: request.id },
          data: { dealershipId: request.users.dealershipId }
        })
        requestsFixed++
        logger.info(`Fixed request ${request.id} with dealershipId ${request.users.dealershipId}`)
      } else {
        logger.warn(`Request ${request.id} - User ${request.users.email} has no dealershipId`)
      }
    }

    logger.info(`Fixed ${requestsFixed} out of ${requestsWithoutDealership.length} requests`)

    // 2. Fix tasks with missing dealershipId
    logger.info('Checking tasks with missing dealershipId...')
    
    const tasksWithoutDealership = await prisma.tasks.findMany({
      where: { dealershipId: null },
      include: { users: true }
    })

    logger.info(`Found ${tasksWithoutDealership.length} tasks without dealershipId`)

    let tasksFixed = 0
    for (const task of tasksWithoutDealership) {
      if (task.users.dealershipId) {
        await prisma.tasks.update({
          where: { id: task.id },
          data: { dealershipId: task.users.dealershipId }
        })
        tasksFixed++
        logger.info(`Fixed task ${task.id} with dealershipId ${task.users.dealershipId}`)
      } else {
        logger.warn(`Task ${task.id} - User ${task.users.email} has no dealershipId`)
      }
    }

    logger.info(`Fixed ${tasksFixed} out of ${tasksWithoutDealership.length} tasks`)

    // 3. Report on users without dealershipId
    const usersWithoutDealership = await prisma.users.findMany({
      where: { dealershipId: null },
      select: { id: true, email: true, role: true, agencyId: true }
    })

    logger.info(`\nUsers without dealershipId: ${usersWithoutDealership.length}`)
    for (const user of usersWithoutDealership) {
      logger.info(`- ${user.email} (${user.role}) - Agency: ${user.agencyId || 'None'}`)
    }

    // 4. Summary statistics
    const stats = {
      totalRequests: await prisma.requests.count(),
      requestsWithDealership: await prisma.requests.count({ where: { dealershipId: { not: null } } }),
      totalTasks: await prisma.tasks.count(),
      tasksWithDealership: await prisma.tasks.count({ where: { dealershipId: { not: null } } }),
      totalUsers: await prisma.users.count(),
      usersWithDealership: await prisma.users.count({ where: { dealershipId: { not: null } } })
    }

    logger.info('\nFinal Statistics:')
    const requestPct = stats.totalRequests > 0 ? Math.round(stats.requestsWithDealership / stats.totalRequests * 100) : 0
    const taskPct = stats.totalTasks > 0 ? Math.round(stats.tasksWithDealership / stats.totalTasks * 100) : 0
    const userPct = stats.totalUsers > 0 ? Math.round(stats.usersWithDealership / stats.totalUsers * 100) : 0
    
    logger.info(`Requests: ${stats.requestsWithDealership}/${stats.totalRequests} have dealershipId (${requestPct}%)`)
    logger.info(`Tasks: ${stats.tasksWithDealership}/${stats.totalTasks} have dealershipId (${taskPct}%)`)
    logger.info(`Users: ${stats.usersWithDealership}/${stats.totalUsers} have dealershipId (${userPct}%)`)

  } catch (error) {
    logger.error('Error fixing missing dealershipIds:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the fix
fixMissingDealershipIds()
  .then(() => {
    logger.info('Migration completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    logger.error('Migration failed:', error)
    process.exit(1)
  })
