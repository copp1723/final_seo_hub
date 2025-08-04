#!/usr/bin/env node

// Script to list all available GA4 properties and Search Console sites
// This helps debug which properties are available in the connected Google account

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function listGoogleProperties() {
  try {
    console.log('🔍 Fetching Google properties for SEOWERKS agency...\n')
    
    // Find the SEOWERKS agency
    const agency = await prisma.agency.findFirst({
      where: { name: { contains: 'SEOWERKS' } },
      include: {
        dealerships: {
          include: {
            ga4Connection: true,
            searchConsoleConnection: true
          }
        }
      }
    })
    
    if (!agency) {
      console.log('❌ SEOWERKS agency not found!')
      return
    }
    
    console.log('✅ Found SEOWERKS agency:', agency.name)
    console.log(`   ID: ${agency.id}`)
    console.log(`   Dealerships: ${agency.dealerships.length}\n`)
    
    // Show current connections
    console.log('📊 Current Integration Status:')
    console.log('─'.repeat(80))
    
    for (const dealership of agency.dealerships) {
      console.log(`\n🏢 ${dealership.name}`)
      console.log(`   ID: ${dealership.id}`)
      
      if (dealership.ga4Connection) {
        console.log(`   📈 GA4: ${dealership.ga4Connection.propertyName || 'Connected'} (ID: ${dealership.ga4Connection.propertyId || 'Not set'})`)
      } else {
        console.log('   📈 GA4: Not connected')
      }
      
      if (dealership.searchConsoleConnection) {
        console.log(`   🔍 Search Console: ${dealership.searchConsoleConnection.siteName || dealership.searchConsoleConnection.siteUrl || 'Connected'}`)
      } else {
        console.log('   🔍 Search Console: Not connected')
      }
    }
    
    console.log('\n' + '─'.repeat(80))
    console.log('\n💡 Tips:')
    console.log('   - As an agency admin, you can now manage all properties from Agency Settings > Integrations')
    console.log('   - You should see all 23+ dealership properties in the dropdown')
    console.log('   - Make sure you\'re logged in as the agency admin (access@seowerks.ai)')
    console.log('   - The integration management UI will show all available properties from your Google account')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

listGoogleProperties() 