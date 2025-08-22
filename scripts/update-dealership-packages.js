const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function updateDealershipPackages() {
  try {
    console.log('🔄 Updating dealership package types...')
    
    // First, find the OneKeel.ai agency
    const oneKeelAgency = await prisma.agencies.findFirst({
      where: { name: 'OneKeel.ai' }
    })
    
    if (!oneKeelAgency) {
      console.log('❌ OneKeel.ai agency not found!')
      return
    }
    
    console.log(`✅ Found OneKeel.ai agency: ${oneKeelAgency.id}`)
    
    // Find the two City dealerships
    const cityDealerships = await prisma.dealerships.findMany({
      where: {
        agencyId: oneKeelAgency.id,
        name: {
          in: ['City CDJR of Brookfield', 'City Chevrolet of Grayslake']
        }
      }
    })
    
    console.log(`📋 Found ${cityDealerships.length} City dealerships:`)
    for (const dealership of cityDealerships) {
      console.log(`   • ${dealership.name} (Current: ${dealership.activePackageType || 'NONE'})`)
    }
    
    // Update both to PLATINUM
    for (const dealership of cityDealerships) {
      const updated = await prisma.dealerships.update({
        where: { id: dealership.id },
        data: { activePackageType: 'PLATINUM' }
      })
      
      console.log(`✅ Updated ${dealership.name}: ${dealership.activePackageType || 'NONE'} → PLATINUM`)
    }
    
    console.log('\n🎉 Package type updates completed!')
    
  } catch (error) {
    console.error('❌ Error updating dealership packages:', error)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  updateDealershipPackages()
}

module.exports = { updateDealershipPackages }