const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function setupDemoConnections() {
  console.log('🔧 Setting up demo GA4 and Search Console connections...\n')
  
  try {
    // Find or create SEOWERKS agency
    let agency = await prisma.agencies.findFirst({
      where: {
        OR: [
          { id: 'f1b175133856c973b7e864b4' },
          { name: { contains: 'SEOWERKS', mode: 'insensitive' } }
        ]
      }
    })
    
    if (!agency) {
      console.log('❌ SEOWERKS agency not found!')
      return
    }
    
    console.log(`✅ Found agency: ${agency.name} (${agency.id})`)
    
    // Create or update GA4 connection for the agency
    const ga4Connection = await prisma.ga4_connections.upsert({
      where: { userId: agency.id },
      update: {
        propertyId: 'GA4-DEMO-PROPERTY',
        propertyName: 'SEOWERKS Demo Property',
        accountId: 'GA4-DEMO-ACCOUNT',
        accessToken: 'demo-access-token',
        refreshToken: 'demo-refresh-token',
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        updatedAt: new Date()
      },
      create: {
        userId: agency.id,
        propertyId: 'GA4-DEMO-PROPERTY',
        propertyName: 'SEOWERKS Demo Property',
        accountId: 'GA4-DEMO-ACCOUNT',
        accessToken: 'demo-access-token',
        refreshToken: 'demo-refresh-token',
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
    
    console.log('✅ GA4 connection created/updated')
    
    // Create or update Search Console connection
    const searchConsoleConnection = await prisma.search_console_connections.upsert({
      where: { userId: agency.id },
      update: {
        siteUrl: 'https://seowerks.ai/',
        siteName: 'SEOWERKS Main Site',
        accessToken: 'demo-sc-access-token',
        refreshToken: 'demo-sc-refresh-token',
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        updatedAt: new Date()
      },
      create: {
        userId: agency.id,
        siteUrl: 'https://seowerks.ai/',
        siteName: 'SEOWERKS Main Site',
        accessToken: 'demo-sc-access-token',
        refreshToken: 'demo-sc-refresh-token',
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
    
    console.log('✅ Search Console connection created/updated')
    
    // Find all dealerships under this agency
    const dealerships = await prisma.dealerships.findMany({
      where: { agencyId: agency.id }
    })
    
    console.log(`\n📊 Setting up connections for ${dealerships.length} dealerships...`)
    
    // Create connections for each dealership
    for (const dealership of dealerships) {
      // GA4 connection for dealership
      await prisma.ga4_connections.upsert({
        where: { userId: dealership.id },
        update: {
          propertyId: `GA4-${dealership.id}`,
          propertyName: `${dealership.name} - GA4 Property`,
          accountId: 'GA4-DEMO-ACCOUNT',
          accessToken: 'demo-access-token',
          refreshToken: 'demo-refresh-token',
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          updatedAt: new Date()
        },
        create: {
          userId: dealership.id,
          propertyId: `GA4-${dealership.id}`,
          propertyName: `${dealership.name} - GA4 Property`,
          accountId: 'GA4-DEMO-ACCOUNT',
          accessToken: 'demo-access-token',
          refreshToken: 'demo-refresh-token',
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      
      // Search Console connection for dealership
      await prisma.search_console_connections.upsert({
        where: { userId: dealership.id },
        update: {
          siteUrl: dealership.website || `https://${dealership.id}.example.com`,
          siteName: `${dealership.name} Website`,
          accessToken: 'demo-sc-access-token',
          refreshToken: 'demo-sc-refresh-token',
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          updatedAt: new Date()
        },
        create: {
          userId: dealership.id,
          siteUrl: dealership.website || `https://${dealership.id}.example.com`,
          siteName: `${dealership.name} Website`,
          accessToken: 'demo-sc-access-token',
          refreshToken: 'demo-sc-refresh-token',
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      
      console.log(`   ✅ ${dealership.name}`)
    }
    
    console.log('\n✨ Demo connections setup complete!')
    console.log('\nConnections created:')
    console.log(`- Agency GA4: ${agency.name} → GA4-DEMO-PROPERTY`)
    console.log(`- Agency Search Console: ${agency.name} → https://seowerks.ai/`)
    console.log(`- ${dealerships.length} dealership connections`)
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

setupDemoConnections()