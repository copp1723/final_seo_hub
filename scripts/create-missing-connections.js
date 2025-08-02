#!/usr/bin/env node

/**
 * Create Missing GA4 and Search Console Connections
 * 
 * This script creates database connections for dealerships that have
 * hardcoded property mappings but are missing their database records.
 */

const { PrismaClient } = require('@prisma/client')

// Import the hardcoded mappings
let DEALERSHIP_PROPERTY_MAPPINGS
try {
  const mappingModule = require('../lib/dealership-property-mapping.ts')
  DEALERSHIP_PROPERTY_MAPPINGS = mappingModule.DEALERSHIP_PROPERTY_MAPPINGS
} catch (error) {
  console.error('❌ Could not load dealership property mappings:', error.message)
  process.exit(1)
}

const prisma = new PrismaClient()

async function createMissingConnections() {
  console.log('🔧 Creating Missing GA4 and Search Console Connections...\n')

  try {
    // Get all dealerships
    const dealerships = await prisma.dealerships.findMany({
      select: {
        id: true,
        name: true,
        agencyId: true
      }
    })

    // Find a system user to associate with connections
    const systemUser = await prisma.users.findFirst({
      where: {
        role: 'SUPER_ADMIN'
      }
    })

    if (!systemUser) {
      console.error('❌ No system user found to associate with connections')
      process.exit(1)
    }

    console.log(`📋 Using system user: ${systemUser.email} (${systemUser.id})`)

    // Get existing connections
    const existingGA4 = await prisma.ga4_connections.findMany({
      select: { dealershipId: true, propertyId: true }
    })

    const existingSC = await prisma.search_console_connections.findMany({
      select: { dealershipId: true, siteUrl: true }
    })

    let ga4Created = 0
    let scCreated = 0
    let errors = []

    console.log('🏢 Processing dealerships...\n')

    for (const dealership of dealerships) {
      const mapping = DEALERSHIP_PROPERTY_MAPPINGS.find(m => m.dealershipId === dealership.id)
      
      if (!mapping) {
        console.log(`⚠️  ${dealership.name}: No hardcoded mapping found - skipping`)
        continue
      }

      console.log(`📊 Processing: ${dealership.name}`)

      // Create GA4 connection if needed
      if (mapping.ga4PropertyId && mapping.hasAccess) {
        const existingGA4Connection = existingGA4.find(c => 
          c.dealershipId === dealership.id && c.propertyId === mapping.ga4PropertyId
        )

        if (!existingGA4Connection) {
          try {
            await prisma.ga4_connections.create({
              data: {
                id: `ga4_${dealership.id}_${Date.now()}`,
                userId: systemUser.id,
                dealershipId: dealership.id,
                propertyId: mapping.ga4PropertyId,
                propertyName: `${dealership.name} - GA4`,
                accessToken: '', // Will be populated when user authenticates
                refreshToken: '', // Will be populated when user authenticates
                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
                createdAt: new Date(),
                updatedAt: new Date()
              }
            })
            console.log(`   ✅ Created GA4 connection: ${mapping.ga4PropertyId}`)
            ga4Created++
          } catch (error) {
            const errorMsg = `Failed to create GA4 connection for ${dealership.name}: ${error.message}`
            console.log(`   ❌ ${errorMsg}`)
            errors.push(errorMsg)
          }
        } else {
          console.log(`   ℹ️  GA4 connection already exists: ${mapping.ga4PropertyId}`)
        }
      } else if (!mapping.ga4PropertyId) {
        console.log(`   ⚠️  No GA4 property ID (intentional): ${mapping.notes || 'No access'}`)
      }

      // Create Search Console connection if needed
      if (mapping.searchConsoleUrl) {
        const existingSCConnection = existingSC.find(c => 
          c.dealershipId === dealership.id && c.siteUrl === mapping.searchConsoleUrl
        )

        if (!existingSCConnection) {
          try {
            await prisma.search_console_connections.create({
              data: {
                id: `sc_${dealership.id}_${Date.now()}`,
                userId: systemUser.id,
                dealershipId: dealership.id,
                siteUrl: mapping.searchConsoleUrl,
                siteName: dealership.name,
                accessToken: '', // Will be populated when user authenticates
                refreshToken: '', // Will be populated when user authenticates
                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
                createdAt: new Date(),
                updatedAt: new Date()
              }
            })
            console.log(`   ✅ Created Search Console connection: ${mapping.searchConsoleUrl}`)
            scCreated++
          } catch (error) {
            const errorMsg = `Failed to create Search Console connection for ${dealership.name}: ${error.message}`
            console.log(`   ❌ ${errorMsg}`)
            errors.push(errorMsg)
          }
        } else {
          console.log(`   ℹ️  Search Console connection already exists: ${mapping.searchConsoleUrl}`)
        }
      }

      console.log('') // Empty line for readability
    }

    // Summary
    console.log('📈 SUMMARY:')
    console.log(`- GA4 connections created: ${ga4Created}`)
    console.log(`- Search Console connections created: ${scCreated}`)
    console.log(`- Total connections created: ${ga4Created + scCreated}`)
    
    if (errors.length > 0) {
      console.log(`\n❌ ERRORS (${errors.length}):`)
      errors.forEach(error => console.log(`   - ${error}`))
    }

    if (ga4Created > 0 || scCreated > 0) {
      console.log('\n✅ SUCCESS! Missing connections have been created.')
      console.log('\n📝 IMPORTANT NOTES:')
      console.log('- These connections have empty access tokens')
      console.log('- Users will need to authenticate with Google to populate tokens')
      console.log('- The system will automatically use these connections once authenticated')
      console.log('\n🔄 NEXT STEPS:')
      console.log('1. Test the dashboard to verify connections are working')
      console.log('2. Set up automatic connection creation for new dealerships')
      console.log('3. Ensure users authenticate with Google Analytics and Search Console')
    } else {
      console.log('\n✅ All connections already exist - no action needed!')
    }

  } catch (error) {
    console.error('❌ Error creating missing connections:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
createMissingConnections()
