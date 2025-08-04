import { PrismaClient, PackageType } from '@prisma/client'

const prisma = new PrismaClient()

async function configurePackages() {
  console.log('Starting package configuration...')
  
  try {
    // Get all dealerships without a package
    const dealershipsWithoutPackage = await prisma.dealerships.findMany({
      where: {
        activePackageType: null
      }
    })
    
    console.log(`Found ${dealershipsWithoutPackage.length} dealerships without packages`)
    
    // Default to SILVER package for all dealerships
    const defaultPackageType = PackageType.SILVER
    const startDate = new Date()
    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() + 1) // 1 month billing period
    
    for (const dealership of dealershipsWithoutPackage) {
      console.log(`Configuring package for dealership: ${dealership.name}`)
      
      // Update dealership with package type and billing period
      await prisma.dealerships.update({
        where: { id: dealership.id },
        data: { 
          activePackageType: defaultPackageType,
          currentBillingPeriodStart: startDate,
          currentBillingPeriodEnd: endDate,
          pagesUsedThisPeriod: 0,
          blogsUsedThisPeriod: 0,
          gbpPostsUsedThisPeriod: 0,
          improvementsUsedThisPeriod: 0
        }
      })
      
      console.log(`  Configured ${defaultPackageType} package for ${dealership.name}`)
    }
    
    // Verify the updates
    const updatedCount = await prisma.dealerships.count({
      where: {
        activePackageType: { not: null }
      }
    })
    
    console.log(`\nPackage configuration complete!`)
    console.log(`Total dealerships with packages: ${updatedCount}`)
    
  } catch (error) {
    console.error('Error configuring packages:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the migration
configurePackages()
  .then(() => {
    console.log('Migration completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Migration failed:', error)
    process.exit(1)
  })