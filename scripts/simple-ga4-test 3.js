#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function simpleGA4Test() {
  console.log('🧪 Simple GA4 Integration Test')
  console.log('=' .repeat(50))
  
  try {
    // 1. Check current GA4 connections
    console.log('\n📊 1. Current GA4 Connections')
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
    
    console.log(`✅ Found ${ga4Connections.length} GA4 connection(s)`)
    
    for (const connection of ga4Connections) {
      console.log(`\n👤 User: ${connection.users.email} (${connection.users.role})`)
      console.log(`   🔗 Connection ID: ${connection.id}`)
      console.log(`   🏢 Dealership ID: ${connection.dealershipId || 'Not set'}`)
      console.log(`   📈 Property ID: ${connection.propertyId || 'Not set'}`)
      console.log(`   📝 Property Name: ${connection.propertyName || 'Not set'}`)
      console.log(`   🔑 Has Access Token: ${connection.accessToken ? 'Yes' : 'No'}`)
      console.log(`   🔄 Has Refresh Token: ${connection.refreshToken ? 'Yes' : 'No'}`)
      
      if (connection.dealershipId) {
        const dealership = await prisma.dealerships.findUnique({
          where: { id: connection.dealershipId }
        })
        console.log(`   🏢 Linked Dealership: ${dealership?.name || 'Unknown'}`)
      }
    }
    
    // 2. Check dealerships without GA4 connections
    console.log('\n🏢 2. Dealerships Without GA4 Connections')
    console.log('-'.repeat(30))
    
    const dealerships = await prisma.dealerships.findMany({
      select: {
        id: true,
        name: true,
        agencyId: true,
        agencies: {
          select: {
            name: true
          }
        }
      }
    })
    
    const dealershipsWithoutGA4 = dealerships.filter(d => 
      !ga4Connections.some(c => c.dealershipId === d.id)
    )
    
    console.log(`📋 Found ${dealershipsWithoutGA4.length} dealership(s) without GA4 connections`)
    
    if (dealershipsWithoutGA4.length > 0) {
      console.log('\n   Dealerships needing GA4 connections:')
      dealershipsWithoutGA4.slice(0, 10).forEach(dealership => {
        console.log(`   - ${dealership.name} (${dealership.agencies.name})`)
      })
      
      if (dealershipsWithoutGA4.length > 10) {
        console.log(`   ... and ${dealershipsWithoutGA4.length - 10} more`)
      }
    }
    
    // 3. Test API endpoint availability
    console.log('\n🌐 3. API Endpoint Testing')
    console.log('-'.repeat(30))
    
    console.log('⚠️  Manual testing required:')
    console.log('   1. Log into the application')
    console.log('   2. Visit: http://localhost:3001/api/ga4/list-properties')
    console.log('   3. Check if all properties are returned')
    console.log('   4. Verify property dropdown in UI shows multiple options')
    
    // 4. Recommendations
    console.log('\n💡 4. Recommendations')
    console.log('-'.repeat(30))
    
    if (ga4Connections.length === 1) {
      console.log('✅ One GA4 connection exists and is now linked to a dealership')
      console.log('🔍 Next steps:')
      console.log('   1. Test the property listing API endpoint')
      console.log('   2. Verify the UI shows the connected property')
      console.log('   3. Test data collection for the connected property')
      console.log('   4. Create GA4 connections for other dealerships if needed')
    }
    
    if (dealershipsWithoutGA4.length > 0) {
      console.log(`⚠️  ${dealershipsWithoutGA4.length} dealerships still need GA4 connections`)
      console.log('   Consider:')
      console.log('   1. Creating GA4 connections for each dealership')
      console.log('   2. Using agency-level GA4 connections')
      console.log('   3. Implementing bulk GA4 connection setup')
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
simpleGA4Test() 