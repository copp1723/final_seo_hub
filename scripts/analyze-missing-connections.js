#!/usr/bin/env node

/**
 * Comprehensive Analysis of Missing GA4 and Search Console Connections
 * 
 * This script identifies dealerships that have hardcoded property mappings
 * but are missing their corresponding database connections.
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

async function analyzeMissingConnections() {
  console.log('🔍 Analyzing Missing GA4 and Search Console Connections...\n')

  try {
    // 1. Get all dealerships from database
    const dealerships = await prisma.dealerships.findMany({
      select: {
        id: true,
        name: true,
        activePackageType: true,
        agencyId: true
      },
      orderBy: { name: 'asc' }
    })

    // 2. Get all existing connections
    const ga4Connections = await prisma.ga4_connections.findMany({
      select: {
        dealershipId: true,
        userId: true,
        propertyId: true,
        propertyName: true
      }
    })

    const scConnections = await prisma.search_console_connections.findMany({
      select: {
        dealershipId: true,
        userId: true,
        siteUrl: true,
        siteName: true
      }
    })

    console.log('📊 CURRENT STATE:')
    console.log(`- Dealerships in Database: ${dealerships.length}`)
    console.log(`- Hardcoded Property Mappings: ${DEALERSHIP_PROPERTY_MAPPINGS.length}`)
    console.log(`- GA4 Connections in Database: ${ga4Connections.length}`)
    console.log(`- Search Console Connections in Database: ${scConnections.length}\n`)

    // 3. Analyze each dealership
    const analysis = {
      missingGA4: [],
      missingSC: [],
      missingBoth: [],
      noMapping: [],
      intentionallyNoGA4: [],
      complete: []
    }

    for (const dealership of dealerships) {
      // Find hardcoded mapping
      const mapping = DEALERSHIP_PROPERTY_MAPPINGS.find(m => m.dealershipId === dealership.id)
      
      // Find database connections
      const ga4Connection = ga4Connections.find(c => c.dealershipId === dealership.id)
      const scConnection = scConnections.find(c => c.dealershipId === dealership.id)

      const item = {
        dealership,
        mapping,
        ga4Connection,
        scConnection,
        shouldHaveGA4: mapping?.ga4PropertyId !== null && mapping?.hasAccess === true,
        shouldHaveSC: mapping?.searchConsoleUrl !== null,
        hasGA4InDB: !!ga4Connection,
        hasSCInDB: !!scConnection
      }

      // Categorize
      if (!mapping) {
        analysis.noMapping.push(item)
      } else if (!item.shouldHaveGA4 && mapping.ga4PropertyId === null) {
        analysis.intentionallyNoGA4.push(item)
      } else if (item.shouldHaveGA4 && item.shouldHaveSC && item.hasGA4InDB && item.hasSCInDB) {
        analysis.complete.push(item)
      } else if (item.shouldHaveGA4 && item.shouldHaveSC && !item.hasGA4InDB && !item.hasSCInDB) {
        analysis.missingBoth.push(item)
      } else if (item.shouldHaveGA4 && !item.hasGA4InDB) {
        analysis.missingGA4.push(item)
      } else if (item.shouldHaveSC && !item.hasSCInDB) {
        analysis.missingSC.push(item)
      }
    }

    // 4. Display detailed results
    console.log('✅ DEALERSHIPS WITH COMPLETE CONNECTIONS:')
    if (analysis.complete.length === 0) {
      console.log('   ⚠️  NO DEALERSHIPS HAVE COMPLETE CONNECTIONS!')
    } else {
      analysis.complete.forEach(item => {
        console.log(`   - ${item.dealership.name}`)
        console.log(`     GA4: ${item.mapping.ga4PropertyId} ✅`)
        console.log(`     SC: ${item.mapping.searchConsoleUrl} ✅`)
      })
    }

    console.log('\n❌ DEALERSHIPS MISSING GA4 CONNECTIONS:')
    if (analysis.missingGA4.length === 0) {
      console.log('   None')
    } else {
      analysis.missingGA4.forEach(item => {
        console.log(`   - ${item.dealership.name}`)
        console.log(`     Expected GA4: ${item.mapping.ga4PropertyId}`)
        console.log(`     Has SC: ${item.hasSCInDB ? '✅' : '❌'}`)
      })
    }

    console.log('\n❌ DEALERSHIPS MISSING SEARCH CONSOLE CONNECTIONS:')
    if (analysis.missingSC.length === 0) {
      console.log('   None')
    } else {
      analysis.missingSC.forEach(item => {
        console.log(`   - ${item.dealership.name}`)
        console.log(`     Expected SC: ${item.mapping.searchConsoleUrl}`)
        console.log(`     Has GA4: ${item.hasGA4InDB ? '✅' : '❌'}`)
      })
    }

    console.log('\n❌ DEALERSHIPS MISSING BOTH CONNECTIONS:')
    if (analysis.missingBoth.length === 0) {
      console.log('   None')
    } else {
      analysis.missingBoth.forEach(item => {
        console.log(`   - ${item.dealership.name}`)
        console.log(`     Expected GA4: ${item.mapping.ga4PropertyId}`)
        console.log(`     Expected SC: ${item.mapping.searchConsoleUrl}`)
        console.log(`     Package: ${item.dealership.activePackageType || 'None'}`)
      })
    }

    console.log('\n⚠️  DEALERSHIPS INTENTIONALLY WITHOUT GA4:')
    analysis.intentionallyNoGA4.forEach(item => {
      console.log(`   - ${item.dealership.name}`)
      console.log(`     Reason: ${item.mapping.notes || 'No GA4 access'}`)
      console.log(`     Has SC: ${item.hasSCInDB ? '✅' : '❌'}`)
    })

    console.log('\n🚨 DEALERSHIPS WITHOUT HARDCODED MAPPINGS:')
    if (analysis.noMapping.length === 0) {
      console.log('   None')
    } else {
      analysis.noMapping.forEach(item => {
        console.log(`   - ${item.dealership.name} (${item.dealership.id})`)
        console.log(`     Package: ${item.dealership.activePackageType || 'None'}`)
        console.log(`     ⚠️  NEEDS MAPPING ADDED TO dealership-property-mapping.ts`)
      })
    }

    // 5. Generate action items
    console.log('\n🔧 ACTION ITEMS:')
    
    const totalMissing = analysis.missingGA4.length + analysis.missingSC.length + analysis.missingBoth.length
    if (totalMissing > 0) {
      console.log(`\n1. CREATE MISSING DATABASE CONNECTIONS (${totalMissing} dealerships):`)
      console.log('   Run: node scripts/create-missing-connections.js')
    }

    if (analysis.noMapping.length > 0) {
      console.log(`\n2. ADD HARDCODED MAPPINGS (${analysis.noMapping.length} dealerships):`)
      console.log('   Edit: lib/dealership-property-mapping.ts')
      analysis.noMapping.forEach(item => {
        console.log(`   - Add mapping for: ${item.dealership.name} (${item.dealership.id})`)
      })
    }

    // 6. Summary statistics
    console.log('\n📈 SUMMARY:')
    console.log(`- Complete Connections: ${analysis.complete.length}`)
    console.log(`- Missing GA4 Only: ${analysis.missingGA4.length}`)
    console.log(`- Missing SC Only: ${analysis.missingSC.length}`)
    console.log(`- Missing Both: ${analysis.missingBoth.length}`)
    console.log(`- Intentionally No GA4: ${analysis.intentionallyNoGA4.length}`)
    console.log(`- No Mapping Found: ${analysis.noMapping.length}`)

    const totalShouldHaveConnections = analysis.complete.length + analysis.missingGA4.length + analysis.missingSC.length + analysis.missingBoth.length
    const coveragePercentage = totalShouldHaveConnections > 0 ? ((analysis.complete.length / totalShouldHaveConnections) * 100).toFixed(1) : 0

    console.log(`\n🎯 CONNECTION COVERAGE: ${coveragePercentage}% (${analysis.complete.length}/${totalShouldHaveConnections})`)

    if (coveragePercentage < 100) {
      console.log('\n⚡ NEXT STEPS:')
      console.log('1. Run the connection creation script to fix missing database connections')
      console.log('2. Set up automatic connection creation for new dealerships')
      console.log('3. Add missing hardcoded mappings for unmapped dealerships')
    }

  } catch (error) {
    console.error('❌ Error analyzing missing connections:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the analysis
analyzeMissingConnections()
