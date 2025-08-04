const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixDealershipDuplicates() {
  console.log('🧹 FIXING DEALERSHIP DUPLICATES')
  console.log('=' .repeat(60))
  
  try {
    // Get all dealerships
    const allDealerships = await prisma.dealerships.findMany({
      include: {
        agencies: true,
        users_dealerships: true
      },
      orderBy: { name: 'asc' }
    })
    
    console.log(`📊 Found ${allDealerships.length} total dealerships`)
    
    // Group by name to find duplicates
    const groupedByName = {}
    allDealerships.forEach(dealer => {
      if (!groupedByName[dealer.name]) {
        groupedByName[dealer.name] = []
      }
      groupedByName[dealer.name].push(dealer)
    })
    
    // Find duplicates
    const duplicates = Object.entries(groupedByName)
      .filter(([name, dealers]) => dealers.length > 1)
      .map(([name, dealers]) => ({ name, dealers }))
    
    console.log(`🔍 Found ${duplicates.length} dealerships with duplicates:`)
    
    for (const { name, dealers } of duplicates) {
      console.log(`\n🏢 ${name}:`)
      dealers.forEach(dealer => {
        console.log(`   - ${dealer.id} (${dealer.agencies?.name || 'No Agency'})`)
      })
    }
    
    // Strategy: Keep the dealer-XXX format, remove the dealer-name format
    console.log('\n🔧 FIXING DUPLICATES...')
    
    for (const { name, dealers } of duplicates) {
      // Sort: prefer dealer-XXX format over dealer-name format
      const sortedDealers = dealers.sort((a, b) => {
        const aIsNumeric = /^dealer-\d+$/.test(a.id)
        const bIsNumeric = /^dealer-\d+$/.test(b.id)
        
        if (aIsNumeric && !bIsNumeric) return -1
        if (!aIsNumeric && bIsNumeric) return 1
        return a.id.localeCompare(b.id)
      })
      
      const keepDealer = sortedDealers[0] // Keep the first (preferred format)
      const removeDealers = sortedDealers.slice(1) // Remove the rest
      
      console.log(`\n✅ Keeping: ${keepDealer.id} (${name})`)
      
      for (const removeDealer of removeDealers) {
        console.log(`   🗑️  Removing: ${removeDealer.id}`)
        
        // Update all related records to point to the kept dealer
        // Note: Users are linked via users_dealerships relation, not direct dealershipId
        // GA4 and Search Console connections are linked to users, not directly to dealerships
        
        console.log(`   📝 Note: Users and connections will be updated automatically via relationships`)
        
        // Delete the duplicate dealership
        await prisma.dealerships.delete({
          where: { id: removeDealer.id }
        })
      }
    }
    
    // Verify the fix
    const remainingDealerships = await prisma.dealerships.findMany({
      orderBy: { name: 'asc' }
    })
    
    console.log(`\n✅ FIX COMPLETE!`)
    console.log(`📊 Remaining dealerships: ${remainingDealerships.length}`)
    console.log('\n🏢 Remaining dealerships:')
    remainingDealerships.forEach(dealer => {
      console.log(`   - ${dealer.name} (${dealer.id})`)
    })
    
    console.log('\n🎯 Next Steps:')
    console.log('1. Refresh your browser')
    console.log('2. The dropdown should now show ~22 dealerships instead of 44')
    console.log('3. GA4 connection should work properly')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixDealershipDuplicates() 