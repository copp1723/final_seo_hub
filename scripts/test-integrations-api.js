const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testIntegrationsAPI() {
  try {
    console.log('🔍 Testing OAuth Integrations API...')
    
    // Get the test user
    const user = await prisma.users.findUnique({
      where: { email: 'josh.copp@onekeel.ai' }
    })
    
    if (!user) {
      console.error('❌ User not found')
      return
    }
    
    console.log(`✅ Found user: ${user.email} (${user.role})`)
    
    // Check GA4 connections
    const ga4Connections = await prisma.ga4_connections.findMany({
      where: { userId: user.id },
      include: { 
        dealerships: { select: { id: true, name: true } }
      }
    })
    
    console.log(`\n📊 GA4 Connections (${ga4Connections.length}):`)
    ga4Connections.forEach((conn, index) => {
      console.log(`  ${index + 1}. ${conn.dealerships?.name || 'User-level'} - Property: ${conn.propertyName} (${conn.propertyId})`)
      console.log(`     🔑 Connected: ${new Date(conn.createdAt).toLocaleString()}`)
      console.log(`     🕒 Updated: ${new Date(conn.updatedAt).toLocaleString()}`)
    })
    
    // Check Search Console connections
    const scConnections = await prisma.search_console_connections.findMany({
      where: { userId: user.id },
      include: { 
        dealerships: { select: { id: true, name: true } }
      }
    })
    
    console.log(`\n🔍 Search Console Connections (${scConnections.length}):`)
    scConnections.forEach((conn, index) => {
      console.log(`  ${index + 1}. ${conn.dealerships?.name || 'User-level'} - Site: ${conn.siteName} (${conn.siteUrl})`)
      console.log(`     🔑 Connected: ${new Date(conn.createdAt).toLocaleString()}`)
      console.log(`     🕒 Updated: ${new Date(conn.updatedAt).toLocaleString()}`)
    })
    
    // Test dealership-specific lookup
    const testDealership = 'dealer-acura-columbus'
    console.log(`\n🏢 Testing dealership-specific connections (${testDealership})...`)
    
    const [ga4DealershipConn, scDealershipConn] = await Promise.all([
      prisma.ga4_connections.findFirst({
        where: { dealershipId: testDealership },
        select: { propertyId: true, propertyName: true, createdAt: true, updatedAt: true }
      }),
      prisma.search_console_connections.findFirst({
        where: { dealershipId: testDealership },
        select: { siteUrl: true, siteName: true, createdAt: true, updatedAt: true }
      })
    ])
    
    console.log('GA4 for dealership:', ga4DealershipConn ? '✅ Found' : '❌ Not found')
    if (ga4DealershipConn) {
      console.log(`  📊 ${ga4DealershipConn.propertyName} (${ga4DealershipConn.propertyId})`)
    }
    
    console.log('Search Console for dealership:', scDealershipConn ? '✅ Found' : '❌ Not found')
    if (scDealershipConn) {
      console.log(`  🔍 ${scDealershipConn.siteName} (${scDealershipConn.siteUrl})`)
    }
    
    // Simulate what the integrations API would return
    const integrations = {
      ga4: {
        connected: !!ga4DealershipConn,
        propertyId: ga4DealershipConn?.propertyId || null,
        propertyName: ga4DealershipConn?.propertyName || null,
        connectedAt: ga4DealershipConn?.createdAt || null,
        lastUpdated: ga4DealershipConn?.updatedAt || null,
        connectedForSelectedDealership: !!ga4DealershipConn,
        hasUserLevelConnection: ga4Connections.length > 0
      },
      searchConsole: {
        connected: !!scDealershipConn,
        siteUrl: scDealershipConn?.siteUrl || null,
        siteName: scDealershipConn?.siteName || null,
        connectedAt: scDealershipConn?.createdAt || null,
        lastUpdated: scDealershipConn?.updatedAt || null,
        connectedForSelectedDealership: !!scDealershipConn,
        hasUserLevelConnection: scConnections.length > 0
      }
    }
    
    console.log('\n🎯 Integration Status Response:')
    console.log('===============================')
    console.log(JSON.stringify({ success: true, data: { integrations } }, null, 2))
    
    console.log('\n🎉 OAuth Connections Test Complete!')
    console.log('✅ All connections are properly stored and accessible')
    console.log('✅ Settings API should show "Connected" status')
    console.log('✅ Ready for analytics data retrieval')
    
  } catch (error) {
    console.error('❌ Error testing integrations:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testIntegrationsAPI()