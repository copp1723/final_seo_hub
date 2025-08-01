const { PrismaClient } = require('@prisma/client')
const { getGA4PropertyId } = require('./lib/dealership-property-mapping.ts')

async function emergencyGA4Check() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🚨 EMERGENCY GA4 CHECK...\n')
    
    // Check current connections
    const connections = await prisma.ga4_connections.findMany({
      include: {
        users: {
          select: { email: true }
        }
      }
    })
    
    console.log(`Found ${connections.length} GA4 connections:`)
    connections.forEach(conn => {
      console.log(`- ${conn.users?.email}: Property ${conn.propertyId}`)
    })
    
    // Check key dealership mappings
    const testDealerships = ['dealer-acura-columbus', 'dealer-jhc-vinita']
    console.log('\nDealership mappings:')
    testDealerships.forEach(id => {
      const propertyId = getGA4PropertyId(id)
      console.log(`- ${id}: ${propertyId}`)
    })
    
    console.log('\n🎯 QUICK FIX NEEDED:')
    console.log('1. All dealerships are likely using the same property')
    console.log('2. Check the getDealershipGA4Data logic')
    console.log('3. Ensure dealership-specific properties are being used')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

emergencyGA4Check()
