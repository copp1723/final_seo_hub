#!/usr/bin/env node

/**
 * Get All Dealership Client IDs for SEOWorks Team
 * Generates a complete list of all dealerships and their client IDs
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function getAllDealershipClientIds() {
  console.log('📋 COMPLETE DEALERSHIP CLIENT ID LIST FOR SEOWORKS TEAM')
  console.log('=====================================================')
  console.log(`📅 Generated: ${new Date().toISOString()}`)
  console.log('')

  try {
    // Get all dealerships with their client IDs, users, and package info
    const dealerships = await prisma.dealerships.findMany({
      select: {
        id: true,
        name: true,
        clientId: true,
        website: true,
        activePackageType: true,
        ga4PropertyId: true,
        users: {
          select: {
            email: true,
            name: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    console.log(`Found ${dealerships.length} total dealerships`)
    console.log('')

    // Group dealerships by whether they have client IDs
    const withClientId = dealerships.filter(d => d.clientId)
    const withoutClientId = dealerships.filter(d => !d.clientId)
    
    console.log('✅ DEALERSHIPS WITH CLIENT IDs (READY FOR WEBHOOKS):')
    console.log('=' .repeat(60))
    
    if (withClientId.length === 0) {
      console.log('❌ No dealerships have client IDs set!')
    } else {
      withClientId.forEach((dealership, index) => {
        console.log(`${index + 1}. ${dealership.name}`)
        console.log(`   🔑 Client ID: "${dealership.clientId}"`)
        console.log(`   🆔 Database ID: ${dealership.id}`)
        console.log(`   🌐 Website: ${dealership.website || 'Not set'}`)
        console.log(`   📦 Package: ${dealership.activePackageType || 'Not set'}`)
        console.log(`   📊 GA4 Property: ${dealership.ga4PropertyId || 'Not set'}`)
        console.log(`   👥 Users: ${dealership.users.length}`)
        dealership.users.forEach(user => {
          console.log(`      • ${user.email} ${user.name ? `(${user.name})` : ''}`)
        })
        console.log('')
      })
    }

    if (withoutClientId.length > 0) {
      console.log('⚠️  DEALERSHIPS WITHOUT CLIENT IDs (WILL CAUSE ORPHANED TASKS):')
      console.log('=' .repeat(65))
      
      withoutClientId.forEach((dealership, index) => {
        console.log(`${index + 1}. ${dealership.name}`)
        console.log(`   🆔 Database ID: ${dealership.id}`)
        console.log(`   ❌ Client ID: NULL (NEEDS TO BE SET!)`)
        console.log(`   🌐 Website: ${dealership.website || 'Not set'}`)
        console.log(`   👥 Users: ${dealership.users.length}`)
        console.log('')
      })

      console.log('🔧 TO FIX MISSING CLIENT IDs:')
      console.log('Run this script to set client IDs to match database IDs:')
      console.log('')
      withoutClientId.forEach(d => {
        console.log(`UPDATE dealerships SET "clientId" = '${d.id}' WHERE id = '${d.id}';`)
      })
      console.log('')
    }

    // Generate quick reference list for SEOWorks team
    console.log('📋 QUICK REFERENCE - CLIENT IDs FOR SEOWORKS WEBHOOKS:')
    console.log('=' .repeat(55))
    console.log('Copy this list to SEOWorks team for webhook configuration:')
    console.log('')
    
    const validDealerships = withClientId.filter(d => d.users.length > 0)
    const dealershipsWithoutUsers = withClientId.filter(d => d.users.length === 0)
    
    if (validDealerships.length > 0) {
      console.log('✅ ACTIVE DEALERSHIPS (Have users, ready for webhooks):')
      validDealerships.forEach(d => {
        console.log(`"${d.clientId}" → ${d.name}`)
      })
      console.log('')
    }
    
    if (dealershipsWithoutUsers.length > 0) {
      console.log('⚠️  DEALERSHIPS WITHOUT USERS (Client ID exists but no users assigned):')
      dealershipsWithoutUsers.forEach(d => {
        console.log(`"${d.clientId}" → ${d.name} (NO USERS - tasks will be orphaned)`)
      })
      console.log('')
    }

    // Summary for SEOWorks team
    console.log('📊 SUMMARY FOR SEOWORKS TEAM:')
    console.log('=' .repeat(35))
    console.log(`✅ Ready for webhooks: ${validDealerships.length} dealerships`)
    console.log(`⚠️  Missing users: ${dealershipsWithoutUsers.length} dealerships`)
    console.log(`❌ Missing client IDs: ${withoutClientId.length} dealerships`)
    console.log(`📈 Total dealerships: ${dealerships.length}`)
    console.log('')

    console.log('🔗 WEBHOOK CONFIGURATION REMINDER:')
    console.log('URL: https://rylie-seo-hub.onrender.com/api/seoworks/webhook')
    console.log('Headers: {"x-api-key": "7f3e9b5d2a8c4f6e1b9d3c7a5e8f2b4d6c9a1e3f7b5d9c2a6e4f8b1d3c7a9e5f"}')
    console.log('Method: POST')
    console.log('')

  } catch (error) {
    console.error('💥 Failed to fetch dealership data:', error.message)
  }
}

getAllDealershipClientIds()
  .then(() => {
    console.log('✅ Client ID list generation completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })