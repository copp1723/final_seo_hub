const { PrismaClient } = require('@prisma/client')

async function testGA4AnalyticsAPI() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🧪 Testing GA4 Analytics API...\n')
    
    // Get the user with GA4 connection
    const user = await prisma.users.findFirst({
      where: {
        ga4_connections: {
          some: {}
        }
      },
      include: {
        ga4_connections: true
      }
    })
    
    if (!user) {
      console.log('❌ No user with GA4 connection found')
      return
    }
    
    console.log(`👤 Testing with user: ${user.email}`)
    console.log(`🔗 GA4 connections: ${user.ga4_connections.length}`)
    
    // Get a sample dealership
    const dealership = await prisma.dealerships.findFirst({
      where: {
        name: {
          contains: 'Acura',
          mode: 'insensitive'
        }
      }
    })
    
    if (!dealership) {
      console.log('❌ No dealership found')
      return
    }
    
    console.log(`🏢 Testing with dealership: ${dealership.name} (${dealership.id})`)
    
    // Test the analytics API endpoint
    const testCases = [
      { name: 'No dealership (user-level)', dealershipId: null },
      { name: 'With dealership', dealershipId: dealership.id }
    ]
    
    for (const testCase of testCases) {
      console.log(`\n🧪 Testing: ${testCase.name}`)
      
      const params = new URLSearchParams({
        dateRange: '30days',
        clearCache: 'true'
      })
      
      if (testCase.dealershipId) {
        params.append('dealershipId', testCase.dealershipId)
      }
      
      try {
        // Simulate the API call (we can't actually make HTTP requests from here)
        console.log(`   📡 Would call: /api/dashboard/analytics?${params.toString()}`)
        console.log(`   📊 Expected to use dealership: ${testCase.dealershipId || 'none'}`)
        
        // Check if this dealership has a mapping
        const { getGA4PropertyId, hasGA4Access } = require('./lib/dealership-property-mapping')
        if (testCase.dealershipId) {
          const propertyId = getGA4PropertyId(testCase.dealershipId)
          const hasAccess = hasGA4Access(testCase.dealershipId)
          console.log(`   🎯 Mapping: ${propertyId ? `Property ${propertyId}` : 'No mapping'} ${hasAccess ? '✅' : '❌'}`)
        }
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`)
      }
    }
    
    console.log('\n💡 Key insights:')
    console.log('1. If dealership has no mapping, should fall back to user connection')
    console.log('2. User connection exists with property 320759942')
    console.log('3. Check if the fallback logic is working correctly')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testGA4AnalyticsAPI()
