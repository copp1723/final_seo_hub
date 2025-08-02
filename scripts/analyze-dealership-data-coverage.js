#!/usr/bin/env node

/**
 * Comprehensive Dealership Data Coverage Analysis
 * 
 * This script analyzes which dealerships should have data vs which are missing GA4/Search Console
 * by cross-referencing hardcoded mappings with actual database connections.
 */

const { PrismaClient } = require('@prisma/client')
const { DEALERSHIP_PROPERTY_MAPPINGS } = require('../lib/dealership-property-mapping.ts')

const prisma = new PrismaClient()

async function analyzeDealershipDataCoverage() {
  console.log('🔍 Analyzing Dealership Data Coverage...\n')

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

    // 2. Get all GA4 connections
    const ga4Connections = await prisma.ga4_connections.findMany({
      select: {
        dealershipId: true,
        userId: true,
        propertyId: true
      }
    })

    // 3. Get all Search Console connections
    const scConnections = await prisma.search_console_connections.findMany({
      select: {
        dealershipId: true,
        userId: true,
        siteUrl: true
      }
    })

    console.log('📊 SUMMARY:')
    console.log(`- Total Dealerships in DB: ${dealerships.length}`)
    console.log(`- Hardcoded Property Mappings: ${DEALERSHIP_PROPERTY_MAPPINGS.length}`)
    console.log(`- GA4 Connections in DB: ${ga4Connections.length}`)
    console.log(`- Search Console Connections in DB: ${scConnections.length}\n`)

    // 4. Analyze each dealership
    console.log('🏢 DEALERSHIP ANALYSIS:\n')

    const analysis = dealerships.map(dealership => {
      // Find hardcoded mapping
      const mapping = DEALERSHIP_PROPERTY_MAPPINGS.find(m => m.dealershipId === dealership.id)
      
      // Find database connections
      const ga4Connection = ga4Connections.find(c => c.dealershipId === dealership.id)
      const scConnection = scConnections.find(c => c.dealershipId === dealership.id)

      return {
        dealership,
        mapping,
        ga4Connection,
        scConnection,
        shouldHaveGA4: mapping?.ga4PropertyId !== null && mapping?.hasAccess === true,
        shouldHaveSC: mapping?.searchConsoleUrl !== null,
        hasGA4InDB: !!ga4Connection,
        hasSCInDB: !!scConnection
      }
    })

    // 5. Categorize dealerships
    const categories = {
      completeData: [],
      missingGA4: [],
      missingSC: [],
      missingBoth: [],
      noMappingFound: [],
      intentionallyNoGA4: []
    }

    analysis.forEach(item => {
      const { dealership, mapping, shouldHaveGA4, shouldHaveSC, hasGA4InDB, hasSCInDB } = item

      if (!mapping) {
        categories.noMappingFound.push(item)
      } else if (!shouldHaveGA4 && mapping.ga4PropertyId === null) {
        categories.intentionallyNoGA4.push(item)
      } else if (shouldHaveGA4 && shouldHaveSC && hasGA4InDB && hasSCInDB) {
        categories.completeData.push(item)
      } else if (shouldHaveGA4 && shouldHaveSC && !hasGA4InDB && !hasSCInDB) {
        categories.missingBoth.push(item)
      } else if (shouldHaveGA4 && !hasGA4InDB) {
        categories.missingGA4.push(item)
      } else if (shouldHaveSC && !hasSCInDB) {
        categories.missingSC.push(item)
      }
    })

    // 6. Display results
    console.log('✅ DEALERSHIPS WITH COMPLETE DATA:')
    categories.completeData.forEach(item => {
      console.log(`   - ${item.dealership.name}`)
      console.log(`     GA4: ${item.mapping.ga4PropertyId} | SC: ${item.mapping.searchConsoleUrl}`)
    })

    console.log('\n❌ DEALERSHIPS MISSING GA4 DATA:')
    categories.missingGA4.forEach(item => {
      console.log(`   - ${item.dealership.name}`)
      console.log(`     Expected GA4: ${item.mapping.ga4PropertyId}`)
      console.log(`     Has SC: ${item.hasSCInDB ? '✅' : '❌'}`)
    })

    console.log('\n❌ DEALERSHIPS MISSING SEARCH CONSOLE DATA:')
    categories.missingSC.forEach(item => {
      console.log(`   - ${item.dealership.name}`)
      console.log(`     Expected SC: ${item.mapping.searchConsoleUrl}`)
      console.log(`     Has GA4: ${item.hasGA4InDB ? '✅' : '❌'}`)
    })

    console.log('\n❌ DEALERSHIPS MISSING BOTH GA4 AND SEARCH CONSOLE:')
    categories.missingBoth.forEach(item => {
      console.log(`   - ${item.dealership.name}`)
      console.log(`     Expected GA4: ${item.mapping.ga4PropertyId}`)
      console.log(`     Expected SC: ${item.mapping.searchConsoleUrl}`)
    })

    console.log('\n⚠️  DEALERSHIPS INTENTIONALLY WITHOUT GA4:')
    categories.intentionallyNoGA4.forEach(item => {
      console.log(`   - ${item.dealership.name}`)
      console.log(`     Reason: ${item.mapping.notes || 'No GA4 access'}`)
      console.log(`     Has SC: ${item.hasSCInDB ? '✅' : '❌'}`)
    })

    console.log('\n🚨 DEALERSHIPS WITHOUT HARDCODED MAPPINGS:')
    categories.noMappingFound.forEach(item => {
      console.log(`   - ${item.dealership.name} (${item.dealership.id})`)
      console.log(`     Package: ${item.dealership.activePackageType || 'None'}`)
    })

    // 7. Summary statistics
    console.log('\n📈 STATISTICS:')
    console.log(`- Complete Data: ${categories.completeData.length}`)
    console.log(`- Missing GA4 Only: ${categories.missingGA4.length}`)
    console.log(`- Missing SC Only: ${categories.missingSC.length}`)
    console.log(`- Missing Both: ${categories.missingBoth.length}`)
    console.log(`- Intentionally No GA4: ${categories.intentionallyNoGA4.length}`)
    console.log(`- No Mapping Found: ${categories.noMappingFound.length}`)

    const totalShouldHaveData = categories.completeData.length + categories.missingGA4.length + categories.missingSC.length + categories.missingBoth.length
    const totalWithCompleteData = categories.completeData.length
    const coveragePercentage = totalShouldHaveData > 0 ? ((totalWithCompleteData / totalShouldHaveData) * 100).toFixed(1) : 0

    console.log(`\n🎯 DATA COVERAGE: ${coveragePercentage}% (${totalWithCompleteData}/${totalShouldHaveData})`)

  } catch (error) {
    console.error('❌ Error analyzing dealership data coverage:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the analysis
analyzeDealershipDataCoverage()
