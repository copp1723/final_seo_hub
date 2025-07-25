import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateDealershipConnections() {
  console.log('Starting dealership connections migration...')

  try {
    // 1. Add dealershipId column to existing connections
    console.log('1. Checking existing connections...')
    
    const ga4Connections = await prisma.ga4_connections.findMany()
    const scConnections = await prisma.search_console_connections.findMany()
    
    console.log(`Found ${ga4Connections.length} GA4 connections`)
    console.log(`Found ${scConnections.length} Search Console connections`)

    // 2. For each user, find their dealership and update connections
    console.log('2. Updating connections with dealership context...')
    
    for (const connection of ga4Connections) {
      const user = await prisma.users.findUnique({
        where: { id: connection.userId },
        include: { agencies: true }
      })
      
      if (user?.dealershipId) {
        await prisma.ga4_connections.update({
          where: { id: connection.id },
          data: { dealershipId: user.dealershipId }
        })
        console.log(`Updated GA4 connection for user ${user.email} with dealership ${user.dealershipId}`)
      }
    }

    for (const connection of scConnections) {
      const user = await prisma.users.findUnique({
        where: { id: connection.userId },
        include: { agencies: true }
      })
      
      if (user?.dealershipId) {
        await prisma.search_console_connections.update({
          where: { id: connection.id },
          data: { dealershipId: user.dealershipId }
        })
        console.log(`Updated Search Console connection for user ${user.email} with dealership ${user.dealershipId}`)
      }
    }

    console.log('3. Migration completed successfully!')
    
  } catch (error) {
    console.error('Migration failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

migrateDealershipConnections()
  .catch(console.error)
  .finally(() => process.exit(0))