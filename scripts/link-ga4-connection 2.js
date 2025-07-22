#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function linkGA4Connection() {
  console.log('🔗 Linking GA4 Connection to Dealership')
  console.log('=' .repeat(50))
  
  try {
    // Find the existing GA4 connection
    const ga4Connection = await prisma.ga4_connections.findFirst({
      where: {
        propertyId: '320759942'
      }
    })
    
    if (!ga4Connection) {
      console.log('❌ No GA4 connection found with property ID 320759942')
      return
    }
    
    console.log(`✅ Found GA4 connection: ${ga4Connection.id}`)
    console.log(`   Property: ${ga4Connection.propertyName} (${ga4Connection.propertyId})`)
    console.log(`   Current Dealership ID: ${ga4Connection.dealershipId || 'Not set'}`)
    
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
        id: ga4Connection.id
      },
      data: {
        dealershipId: dealership.id
      }
    })
    
    console.log(`✅ Successfully linked GA4 connection to dealership`)
    console.log(`   Connection ID: ${ga4Connection.id}`)
    console.log(`   Dealership ID: ${dealership.id}`)
    console.log(`   Property: ${ga4Connection.propertyName}`)
    
  } catch (error) {
    console.error('❌ Failed to link GA4 connection:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
linkGA4Connection() 