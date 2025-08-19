#!/usr/bin/env node

/**
 * SAFE CLIENT ID FIXER
 * 
 * This script ONLY adds client IDs to dealerships that are missing them.
 * It will NOT touch dealerships that already have client IDs.
 * 
 * PROTECTED DEALERSHIPS (will not be modified):
 * - dealer-acura-columbus (client ID: "dealer-acura-columbus")
 * - dealer-genesis-wichita (client ID: "dealer-genesis-wichita")
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixMissingClientIds() {
  console.log('🔧 SAFE CLIENT ID FIXER - MISSING IDs ONLY')
  console.log('==========================================')
  console.log('🛡️  PROTECTED: Dealerships with existing client IDs will NOT be touched')
  console.log('')

  try {
    // First, get all dealerships and identify which ones need fixing
    const allDealerships = await prisma.dealerships.findMany({
      select: {
        id: true,
        name: true,
        clientId: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    const withClientId = allDealerships.filter(d => d.clientId)
    const withoutClientId = allDealerships.filter(d => !d.clientId)

    console.log('📊 CURRENT STATUS:')
    console.log(`   ✅ Dealerships with client IDs: ${withClientId.length}`)
    console.log(`   ❌ Dealerships missing client IDs: ${withoutClientId.length}`)
    console.log('')

    console.log('🛡️  PROTECTED DEALERSHIPS (will NOT be modified):')
    withClientId.forEach(d => {
      console.log(`   ✅ ${d.name} → client ID: "${d.clientId}"`)
    })
    console.log('')

    if (withoutClientId.length === 0) {
      console.log('🎉 All dealerships already have client IDs! Nothing to fix.')
      return
    }

    console.log('🔧 DEALERSHIPS TO FIX (missing client IDs):')
    withoutClientId.forEach((d, index) => {
      console.log(`   ${index + 1}. ${d.name} → will set client ID: "${d.id}"`)
    })
    console.log('')

    console.log('⚠️  SAFETY CHECK: Confirming no protected dealerships will be modified...')
    const protectedIds = ['dealer-acura-columbus', 'dealer-genesis-wichita']
    const safeToModify = withoutClientId.filter(d => !protectedIds.includes(d.id))
    const wouldBeProtected = withoutClientId.filter(d => protectedIds.includes(d.id))

    if (wouldBeProtected.length > 0) {
      console.log('🚨 SAFETY VIOLATION DETECTED!')
      console.log('   The following protected dealerships are missing client IDs:')
      wouldBeProtected.forEach(d => {
        console.log(`   ⚠️  ${d.name} (${d.id})`)
      })
      console.log('   This should not happen. Aborting for safety.')
      return
    }

    console.log('✅ Safety check passed. All protected dealerships already have client IDs.')
    console.log('')

    console.log('🚀 PROCEEDING TO FIX MISSING CLIENT IDs...')
    console.log('')

    let fixedCount = 0
    
    for (const dealership of safeToModify) {
      try {
        const updated = await prisma.dealerships.update({
          where: { id: dealership.id },
          data: { clientId: dealership.id }
        })
        
        console.log(`   ✅ ${dealership.name} → client ID set to "${dealership.id}"`)
        fixedCount++
        
      } catch (error) {
        console.log(`   ❌ Failed to update ${dealership.name}: ${error.message}`)
      }
    }

    console.log('')
    console.log('📊 RESULTS:')
    console.log(`   ✅ Successfully fixed: ${fixedCount} dealerships`)
    console.log(`   ❌ Failed to fix: ${safeToModify.length - fixedCount} dealerships`)
    console.log(`   🛡️  Protected (untouched): ${withClientId.length} dealerships`)
    console.log('')

    // Final verification
    console.log('🔍 FINAL VERIFICATION:')
    const finalCheck = await prisma.dealerships.findMany({
      select: {
        id: true,
        name: true,
        clientId: true
      },
      orderBy: { name: 'asc' }
    })

    const finalWithClientId = finalCheck.filter(d => d.clientId)
    const finalWithoutClientId = finalCheck.filter(d => !d.clientId)

    console.log(`   ✅ Total dealerships with client IDs: ${finalWithClientId.length}`)
    console.log(`   ❌ Total dealerships still missing client IDs: ${finalWithoutClientId.length}`)

    if (finalWithoutClientId.length > 0) {
      console.log('   ⚠️  Still missing client IDs:')
      finalWithoutClientId.forEach(d => {
        console.log(`      • ${d.name} (${d.id})`)
      })
    }

    console.log('')
    console.log('📋 UPDATED CLIENT ID LIST FOR SEOWORKS TEAM:')
    console.log('===========================================')
    finalWithClientId.forEach(d => {
      console.log(`"${d.clientId}" → ${d.name}`)
    })

  } catch (error) {
    console.error('💥 Script failed:', error.message)
  }
}

fixMissingClientIds()
  .then(() => {
    console.log('\n✅ Safe client ID fix completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })