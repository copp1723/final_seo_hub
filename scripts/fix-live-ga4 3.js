#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')

// This will use the DATABASE_URL from your Render environment
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

async function fixLiveGA4Connection() {
  console.log('🔧 Fixing GA4 Connection on Live Database')
  console.log('=' .repeat(50))
  
  try {
    // Check current GA4 connections
    console.log('\n📊 Current GA4 Connections:')
    console.log('-'.repeat(30))
    
    const ga4Connections = await prisma.ga4_connections.findMany({
      include: {
        users: {
          select: {
            email: true,
            role: true
          }
        }
      }
    })
    
    console.log(`Found ${ga4Connections.length} GA4 connection(s)`)
    
    for (const connection of ga4Connections) {
      console.log(`\n👤 User: ${connection.users.email} (${connection.users.role})`)
      console.log(`   🔗 Connection ID: ${connection.id}`)
      console.log(`   🏢 Dealership ID: ${connection.dealershipId || 'Not set'}`)
      console.log(`   📈 Property ID: ${connection.propertyId || 'Not set'}`)
      console.log(`   📝 Property Name: ${connection.propertyName || 'Not set'}`)
    }
    
    // Find the GA4 connection that needs to be linked
    const orphanedConnection = ga4Connections.find(c => 
      c.propertyId === '320759942' && !c.dealershipId
    )
    
    if (!orphanedConnection) {
      console.log('\n❌ No orphaned GA4 connection found with property ID 320759942')
      
      // Check if connection is already linked
      const linkedConnection = ga4Connections.find(c => 
        c.propertyId === '320759942' && c.dealershipId
      )
      
      if (linkedConnection) {
        console.log('✅ GA4 connection is already properly linked!')
        return
      }
      
      return
    }
    
    console.log(`\n🔧 Found orphaned connection: ${orphanedConnection.id}`)
    
    // Find the Jay Hatfield Chevrolet dealership
    const dealership = await prisma.dealerships.findFirst({
      where: {
        name: {
          contains: 'Jay Hatfield Chevrolet'
        }
      }
    })
    
    if (!dealership) {
      console.log('❌ No Jay Hatfield Chevrolet dealership found')
      return
    }
    
    console.log(`✅ Found dealership: ${dealership.name} (${dealership.id})`)
    
    // Link the connection to the dealership
    await prisma.ga4_connections.update({
      where: {
        id: orphanedConnection.id
      },
      data: {
        dealershipId: dealership.id
      }
    })
    
    console.log(`✅ Successfully linked GA4 connection to dealership!`)
    console.log(`   Connection ID: ${orphanedConnection.id}`)
    console.log(`   Dealership ID: ${dealership.id}`)
    console.log(`   Property: ${orphanedConnection.propertyName}`)
    
    // Verify the fix
    console.log('\n🔍 Verifying the fix:')
    const updatedConnection = await prisma.ga4_connections.findUnique({
      where: { id: orphanedConnection.id },
      include: {
        users: {
          select: {
            email: true
          }
        }
      }
    })
    
    console.log(`   ✅ Connection now linked to: ${updatedConnection.dealershipId}`)
    
  } catch (error) {
    console.error('❌ Failed to fix GA4 connection:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the fix
fixLiveGA4Connection() 