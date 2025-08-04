const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testAPIDealershipFiltering() {
  console.log('🔍 Testing API Dealership Filtering...\n')
  
  try {
    // Get the test user (access user)
    const testUser = await prisma.users.findFirst({
      where: { email: 'access@seowerks.ai' },
      select: {
        id: true,
        email: true,
        name: true,
        dealershipId: true,
        agencyId: true,
        role: true
      }
    })
    
    if (!testUser) {
      console.log('❌ Test user not found')
      return
    }
    
    console.log('👤 Test User:', testUser)
    
    // Test 1: Get available dealerships for this user
    console.log('\n1. Testing dealership availability...')
    
    if (testUser.role === 'SUPER_ADMIN') {
      const allDealerships = await prisma.dealerships.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
      })
      console.log(`Super admin can access ${allDealerships.length} dealerships`)
    } else {
      // Regular user - get dealerships from their agency
      const userWithAgency = await prisma.users.findUnique({
        where: { id: testUser.id },
        include: {
          agencies: {
            include: {
              dealerships: {
                select: { id: true, name: true }
              }
            }
          }
        }
      })
      
      const availableDealerships = userWithAgency?.agencies?.dealerships || []
      console.log(`Agency user can access ${availableDealerships.length} dealerships:`)
      availableDealerships.forEach(d => {
        console.log(`  - ${d.name} (${d.id})`)
      })
    }
    
    // Test 2: Test GA4 data filtering for specific dealership
    console.log('\n2. Testing GA4 data filtering...')
    
    const testDealershipId = 'dealer-acura-columbus'
    console.log(`Testing with dealership: ${testDealershipId}`)
    
    // Check GA4 connection for this dealership
    const ga4Connection = await prisma.ga4_connections.findFirst({
      where: { dealershipId: testDealershipId },
      select: {
        id: true,
        propertyId: true,
        dealershipId: true,
        dealerships: {
          select: { name: true }
        }
      }
    })
    
    if (ga4Connection) {
      console.log(`✅ Found GA4 connection for ${ga4Connection.dealerships?.name}:`)
      console.log(`   Property ID: ${ga4Connection.propertyId}`)
    } else {
      console.log(`❌ No GA4 connection found for dealership ${testDealershipId}`)
      
      // Check for user-level connection as fallback
      const userGA4Connection = await prisma.ga4_connections.findFirst({
        where: { 
          userId: testUser.id,
          dealershipId: null 
        },
        select: {
          id: true,
          propertyId: true
        }
      })
      
      if (userGA4Connection) {
        console.log(`✅ Found user-level GA4 connection as fallback:`)
        console.log(`   Property ID: ${userGA4Connection.propertyId}`)
      } else {
        console.log(`❌ No user-level GA4 connection found either`)
      }
    }
    
    // Test 3: Test Search Console data filtering
    console.log('\n3. Testing Search Console data filtering...')
    
    const scConnection = await prisma.search_console_connections.findFirst({
      where: { dealershipId: testDealershipId },
      select: {
        id: true,
        siteUrl: true,
        dealershipId: true,
        dealerships: {
          select: { name: true }
        }
      }
    })
    
    if (scConnection) {
      console.log(`✅ Found Search Console connection for ${scConnection.dealerships?.name}:`)
      console.log(`   Site URL: ${scConnection.siteUrl}`)
    } else {
      console.log(`❌ No Search Console connection found for dealership ${testDealershipId}`)
      
      // Check for user-level connection as fallback
      const userSCConnection = await prisma.search_console_connections.findFirst({
        where: { 
          userId: testUser.id,
          dealershipId: null 
        },
        select: {
          id: true,
          siteUrl: true
        }
      })
      
      if (userSCConnection) {
        console.log(`✅ Found user-level Search Console connection as fallback:`)
        console.log(`   Site URL: ${userSCConnection.siteUrl}`)
      } else {
        console.log(`❌ No user-level Search Console connection found either`)
      }
    }
    
    // Test 4: Test switching to a different dealership
    console.log('\n4. Testing dealership switch simulation...')
    
    const targetDealershipId = 'dealer-jhc-columbus' // Jay Hatfield Chevrolet of Columbus
    const targetDealership = await prisma.dealerships.findUnique({
      where: { id: targetDealershipId },
      select: { id: true, name: true, agencyId: true }
    })
    
    if (targetDealership) {
      console.log(`Target dealership: ${targetDealership.name}`)
      
      // Check if user has access to this dealership (same agency)
      if (testUser.agencyId === targetDealership.agencyId || testUser.role === 'SUPER_ADMIN') {
        console.log(`✅ User has access to switch to ${targetDealership.name}`)
        
        // Check connections for target dealership
        const targetGA4 = await prisma.ga4_connections.findFirst({
          where: { dealershipId: targetDealershipId },
          select: { propertyId: true }
        })
        
        const targetSC = await prisma.search_console_connections.findFirst({
          where: { dealershipId: targetDealershipId },
          select: { siteUrl: true }
        })
        
        console.log(`   GA4 Connection: ${targetGA4 ? targetGA4.propertyId : 'None'}`)
        console.log(`   Search Console: ${targetSC ? targetSC.siteUrl : 'None'}`)
        
      } else {
        console.log(`❌ User does not have access to switch to ${targetDealership.name}`)
        console.log(`   User agency: ${testUser.agencyId}`)
        console.log(`   Dealership agency: ${targetDealership.agencyId}`)
      }
    } else {
      console.log(`❌ Target dealership ${targetDealershipId} not found`)
    }
    
    console.log('\n✅ API dealership filtering test completed!')
    
  } catch (error) {
    console.error('❌ Error testing API dealership filtering:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testAPIDealershipFiltering()
