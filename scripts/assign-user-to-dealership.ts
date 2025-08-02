#!/usr/bin/env npx tsx
/**
 * Script to assign a dealership to a user
 * Run with: npx tsx scripts/assign-user-to-dealership.ts <email> <dealershipId>
 * Example: npx tsx scripts/assign-user-to-dealership.ts rylie1234@gmail.com dealer-acura-columbus
 */

import { prisma } from '../lib/prisma'
import { logger } from '../lib/logger'

async function assignUserToDealership() {
  const args = process.argv.slice(2)
  
  if (args.length !== 2) {
    logger.error('Usage: npx tsx scripts/assign-user-to-dealership.ts <email> <dealershipId>')
    logger.info('\nExample: npx tsx scripts/assign-user-to-dealership.ts rylie1234@gmail.com dealer-acura-columbus')
    
    // Show available dealerships
    const dealerships = await prisma.dealerships.findMany({
      select: { id: true, name: true },
      take: 10
    })
    
    logger.info('\nAvailable dealerships:')
    dealerships.forEach(d => {
      logger.info(`  ${d.id} - ${d.name}`)
    })
    
    process.exit(1)
  }

  const [email, dealershipId] = args

  try {
    // Find the user
    const user = await prisma.users.findUnique({
      where: { email },
      include: { dealerships: true }
    })

    if (!user) {
      logger.error(`User not found: ${email}`)
      process.exit(1)
    }

    // Find the dealership
    const dealership = await prisma.dealerships.findUnique({
      where: { id: dealershipId }
    })

    if (!dealership) {
      logger.error(`Dealership not found: ${dealershipId}`)
      
      // Show available dealerships
      const dealerships = await prisma.dealerships.findMany({
        select: { id: true, name: true }
      })
      
      logger.info('\nAvailable dealerships:')
      dealerships.forEach(d => {
        logger.info(`  ${d.id} - ${d.name}`)
      })
      
      process.exit(1)
    }

    // Check current assignment
    if (user.dealershipId === dealershipId) {
      logger.info(`User ${email} is already assigned to ${dealership.name}`)
      process.exit(0)
    }

    // Update the user
    const updatedUser = await prisma.users.update({
      where: { id: user.id },
      data: { dealershipId: dealership.id }
    })

    logger.info(`✅ Successfully assigned ${email} to ${dealership.name}`)
    
    // Update any requests without dealershipId for this user
    const requestsUpdated = await prisma.requests.updateMany({
      where: {
        userId: user.id,
        dealershipId: null
      },
      data: { dealershipId: dealership.id }
    })

    if (requestsUpdated.count > 0) {
      logger.info(`✅ Updated ${requestsUpdated.count} requests with the new dealershipId`)
    }

    // Update any tasks without dealershipId for this user
    const tasksUpdated = await prisma.tasks.updateMany({
      where: {
        userId: user.id,
        dealershipId: null
      },
      data: { dealershipId: dealership.id }
    })

    if (tasksUpdated.count > 0) {
      logger.info(`✅ Updated ${tasksUpdated.count} tasks with the new dealershipId`)
    }

  } catch (error) {
    logger.error('Failed to assign user to dealership:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the assignment
assignUserToDealership()
