const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function addOneKeelDealerships() {
  try {
    console.log('🚀 Adding dealerships to ONE KEEL AI agency...')
    
    // Find the ONE KEEL AI agency
    const agency = await prisma.agencies.findFirst({
      where: { 
        OR: [
          { name: 'OneKeel AI' },
          { name: 'OneKeel.ai' },
          { slug: 'onekeel-ai' }
        ]
      }
    })
    
    if (!agency) {
      console.error('❌ ONE KEEL AI agency not found!')
      process.exit(1)
    }
    
    console.log(`✅ Found ONE KEEL AI agency: ${agency.name} (ID: ${agency.id})`)
    
    // Dealerships to add
    const dealershipsData = [
      {
        name: 'City CDJR of Brookfield',
        clientId: 'dealer-city-cdjr-brookfield',
        website: 'https://www.citycdjrofbrookfield.com',
        address: 'Brookfield, WI',
        package: 'GOLD'
      },
      {
        name: 'City Chevrolet of Grayslake',
        clientId: 'dealer-city-chevrolet-grayslake', 
        website: 'https://www.citychevroletofgrayslake.com',
        address: 'Grayslake, IL',
        package: 'GOLD'
      }
    ]
    
    console.log('\n🏢 Adding dealerships...')
    
    for (const dealershipData of dealershipsData) {
      // Check if dealership already exists
      const existing = await prisma.dealerships.findFirst({
        where: { 
          OR: [
            { name: dealershipData.name },
            { clientId: dealershipData.clientId }
          ]
        }
      })
      
      if (existing) {
        console.log(`⚠️  Dealership already exists: ${dealershipData.name}`)
        // Update to ensure it's assigned to ONE KEEL AI agency
        await prisma.dealerships.update({
          where: { id: existing.id },
          data: {
            agencyId: agency.id,
            clientId: dealershipData.clientId,
            activePackageType: dealershipData.package
          }
        })
        console.log(`✅ Updated dealership assignment: ${dealershipData.name}`)
      } else {
        // Create new dealership
        const dealership = await prisma.dealerships.create({
          data: {
            name: dealershipData.name,
            agencyId: agency.id,
            clientId: dealershipData.clientId,
            website: dealershipData.website,
            address: dealershipData.address,
            activePackageType: dealershipData.package,
            currentBillingPeriodStart: new Date(),
            currentBillingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            updatedAt: new Date(),
            settings: {
              emailNotifications: true,
              autoApprove: false,
              defaultPackage: dealershipData.package
            }
          }
        })
        console.log(`✅ Created dealership: ${dealershipData.name} (ID: ${dealership.id})`)
      }
    }
    
    // Verify final setup
    const finalDealerships = await prisma.dealerships.findMany({
      where: { agencyId: agency.id },
      select: { id: true, name: true, clientId: true, activePackageType: true }
    })
    
    console.log('\n🎉 SETUP COMPLETE!')
    console.log('=' * 50)
    console.log(`📊 Agency: ${agency.name} (ID: ${agency.id})`)
    console.log(`🏢 Dealerships: ${finalDealerships.length}`)
    finalDealerships.forEach((d, i) => {
      console.log(`   ${i + 1}. ${d.name}`)
      console.log(`      Client ID: ${d.clientId}`)
      console.log(`      Package: ${d.activePackageType}`)
    })
    
  } catch (error) {
    console.error('❌ Error adding dealerships:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
if (require.main === module) {
  addOneKeelDealerships()
    .then(() => {
      console.log('✅ Dealerships added successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Failed to add dealerships:', error)
      process.exit(1)
    })
}

module.exports = { addOneKeelDealerships }