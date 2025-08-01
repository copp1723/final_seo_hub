const { PrismaClient } = require('@prisma/client')

async function debugProductionGA4() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔍 Debugging Production GA4 Issues...\n')
    
    // Check current GA4 connections
    const connections = await prisma.ga4_connections.findMany({
      select: {
        id: true,
        userId: true,
        dealershipId: true,
        propertyId: true,
        propertyName: true,
        createdAt: true,
        updatedAt: true,
        expiresAt: true,
        users: {
          select: {
            email: true,
            role: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })
    
    console.log(`📊 Found ${connections.length} GA4 connections:`)
    if (connections.length === 0) {
      console.log('❌ No GA4 connections found in database')
      console.log('This explains why the reports page shows "Connect GA4"')
    } else {
      connections.forEach((conn, i) => {
        const isExpired = conn.expiresAt ? new Date() > conn.expiresAt : false
        console.log(`\n${i + 1}. Connection ID: ${conn.id}`)
        console.log(`   User: ${conn.users?.email} (${conn.users?.role})`)
        console.log(`   Property: ${conn.propertyName} (${conn.propertyId})`)
        console.log(`   Dealership: ${conn.dealershipId || 'User-level'}`)
        console.log(`   Created: ${conn.createdAt}`)
        console.log(`   Updated: ${conn.updatedAt}`)
        console.log(`   Expires: ${conn.expiresAt}`)
        console.log(`   Status: ${isExpired ? '❌ EXPIRED' : '✅ ACTIVE'}`)
      })
    }
    
    // Check users who should have GA4 access
    const adminUsers = await prisma.users.findMany({
      where: {
        role: {
          in: ['SUPER_ADMIN', 'AGENCY_ADMIN', 'ADMIN']
        }
      },
      select: {
        id: true,
        email: true,
        role: true,
        ga4_connections: {
          select: {
            id: true,
            propertyId: true
          }
        }
      }
    })
    
    console.log(`\n👥 Admin users and their GA4 status:`)
    adminUsers.forEach(user => {
      const hasGA4 = user.ga4_connections.length > 0
      console.log(`   ${user.email} (${user.role}): ${hasGA4 ? '✅ Has GA4' : '❌ No GA4'}`)
    })
    
    // Check dealership mappings
    console.log(`\n🏢 Checking dealership property mappings...`)
    const { getGA4PropertyId, hasGA4Access } = require('./lib/dealership-property-mapping')
    
    const sampleDealerships = ['dealer-acura-columbus', 'dealer-jhc-vinita', 'dealer-jhc-columbus']
    sampleDealerships.forEach(dealershipId => {
      const propertyId = getGA4PropertyId(dealershipId)
      const hasAccess = hasGA4Access(dealershipId)
      console.log(`   ${dealershipId}: ${propertyId ? `Property ${propertyId}` : 'No mapping'} ${hasAccess ? '✅' : '❌'}`)
    })
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugProductionGA4()
