const { PrismaClient } = require('@prisma/client')
const { getGA4PropertyId, hasGA4Access } = require('./lib/dealership-property-mapping.ts')

async function testPropertyMismatch() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔍 Testing Property Access Mismatch...\n')
    
    // Get user's GA4 connection
    const connection = await prisma.ga4_connections.findFirst({
      include: {
        users: {
          select: {
            email: true
          }
        }
      }
    })
    
    if (!connection) {
      console.log('❌ No GA4 connection found')
      return
    }
    
    console.log(`👤 User: ${connection.users?.email}`)
    console.log(`🔗 User's GA4 Property: ${connection.propertyId} (${connection.propertyName})`)
    
    // Test different dealership selections
    const testDealerships = [
      'dealer-acura-columbus',
      'dealer-jhc-vinita', 
      'dealer-jhc-columbus',
      'dealer-world-kia'
    ]
    
    console.log('\n🏢 Testing dealership property mappings:')
    
    testDealerships.forEach(dealershipId => {
      const propertyId = getGA4PropertyId(dealershipId)
      const hasAccess = hasGA4Access(dealershipId)
      const matchesUserConnection = propertyId === connection.propertyId
      
      console.log(`\n   ${dealershipId}:`)
      console.log(`   ├─ Mapped Property: ${propertyId || 'None'}`)
      console.log(`   ├─ Has Access: ${hasAccess ? '✅' : '❌'}`)
      console.log(`   ├─ Matches User Connection: ${matchesUserConnection ? '✅' : '❌'}`)
      console.log(`   └─ Expected Result: ${matchesUserConnection || !propertyId ? 'Should work with fallback' : 'Will fail - property mismatch'}`)
    })
    
    console.log('\n🎯 Root Cause Analysis:')
    console.log('1. User has access to property 320759942 (Jay Hatfield Chevrolet of Vinita)')
    console.log('2. When "Acura of Columbus" is selected, system tries to use property 284944578')
    console.log('3. User doesn\'t have access to property 284944578')
    console.log('4. API call fails, hasGA4Connection = false')
    console.log('5. Reports page shows "Connect GA4" button')
    
    console.log('\n💡 Solutions:')
    console.log('A. Fix fallback logic to use user connection when property access fails')
    console.log('B. Show proper error message about property access')
    console.log('C. Only show dealerships the user has property access to')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testPropertyMismatch()
