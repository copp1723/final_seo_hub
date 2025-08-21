import { PrismaClient, PackageType, RequestStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function resetAndInitDealerships() {
  console.log('Starting dealership reset and initialization...')
  
  try {
    // First, delete all existing dealerships
    console.log('Deleting all existing dealerships...')
    await prisma.dealerships.deleteMany({})
    console.log('All dealerships deleted.')
    
    // Get the agency ID (assuming there's one agency)
    const agency = await prisma.agencies.findFirst()
    if (!agency) {
      throw new Error('No agency found in the database')
    }
    
    // Recreate dealerships with proper package configuration
    const dealershipData = [
      { name: 'Jay Hatfield Chevrolet of Columbus', website: 'https://www.jayhatchevycolumbus.com' },
      { name: 'Jay Hatfield Chevrolet GMC of Chanute', website: 'https://www.jayhatchevychanute.com' },
      { name: 'Jay Hatfield Chevrolet GMC of Pittsburg', website: 'https://www.jayhatchevypittsburg.com' },
      { name: 'Jay Hatfield Chevrolet of Vinita', website: 'https://www.jayhatchevyvinita.com' },
      { name: 'Jay Hatfield CDJR of Frontenac', website: 'https://www.jayhatcdjrfrontenac.com' },
      { name: 'Sarcoxie Ford', website: 'https://www.sarcoxieford.com' },
      { name: 'Jay Hatfield Honda Powerhouse', website: 'https://www.jayhathonda.com' },
      { name: 'Jay Hatfield Motorsports of Wichita', website: 'https://www.jayhatmotorsportswichita.com' },
      { name: 'Jay Hatfield Motorsports of Frontenac', website: 'https://www.jayhatmotorsportsfrontenac.com' },
      { name: 'Jay Hatfield Motorsports of Joplin', website: 'https://www.jayhatmotorsportsjoplin.com' },
      { name: 'Acura of Columbus', website: 'https://www.acuraofcolumbus.com' },
      { name: 'Genesis of Wichita', website: 'https://www.genesisofwichita.com' },
      { name: 'Jay Hatfield Motorsports Portal', website: 'https://www.jayhatmotorsports.com' },
      { name: 'Jay Hatfield Motorsports Ottawa', website: 'https://www.jayhatmotorsportsottawa.com' },
      { name: 'Hatchett Hyundai East', website: 'https://www.hatchetthyundaieast.com' },
      { name: 'Hatchett Hyundai West', website: 'https://www.hatchetthyundaiwest.com' },
      { name: 'Premier Mitsubishi', website: 'https://www.premiermitsubishi.com' },
      { name: 'Premier Auto Center - Tucson', website: 'https://www.premierautotucson.com' },
      { name: 'World Kia', website: 'https://www.worldkia.com' },
      { name: 'AEO Powersports', website: 'https://www.aeopowersports.com' },
      { name: 'Columbus Auto Group', website: 'https://www.columbusautogroup.com' },
      { name: 'Winnebago of Rockford', website: 'https://www.winnebagorockford.com' },
    ]
    
    // Set billing period to cover existing requests
    const billingStart = new Date('2024-01-01') // Start of year
    const billingEnd = new Date('2024-12-31')   // End of year
    
    console.log(`Creating ${dealershipData.length} dealerships with SILVER packages...`)
    
    const createdDealerships: any[] = []
    
    for (const data of dealershipData) {
      const dealership = await prisma.dealerships.create({
        data: {
          ...data,
          agencyId: agency.id,
          activePackageType: PackageType.SILVER,
          currentBillingPeriodStart: billingStart,
          currentBillingPeriodEnd: billingEnd,
          pagesUsedThisPeriod: 0,
          blogsUsedThisPeriod: 0,
          gbpPostsUsedThisPeriod: 0,
          improvementsUsedThisPeriod: 0,
          updatedAt: new Date()
        }
      })
      createdDealerships.push(dealership)
      console.log(`  Created: ${dealership.name}`)
    }
    
    // Now update requests to associate with new dealerships
    console.log('\nUpdating request associations...')
    
    // Get all requests
    const requests = await prisma.requests.findMany({
      include: {
        users: true
      }
    })
    
    console.log(`Found ${requests.length} requests to process`)
    
    // Simple round-robin assignment of requests to dealerships
    let dealershipIndex = 0
    
    for (const request of requests) {
      const dealership = createdDealerships[dealershipIndex % createdDealerships.length]
      
      await prisma.requests.update({
        where: { id: request.id },
        data: {
          dealershipId: dealership.id,
          agencyId: agency.id
        }
      })
      
      dealershipIndex++
    }
    
    // Now calculate usage for each dealership
    console.log('\nCalculating usage counters...')
    
    for (const dealership of createdDealerships) {
      const completedRequests = await prisma.requests.findMany({
        where: {
          dealershipId: dealership.id,
          status: RequestStatus.COMPLETED
        }
      })
      
      let pagesCount = 0
      let blogsCount = 0
      let gbpPostsCount = 0
      let improvementsCount = 0
      
      for (const request of completedRequests) {
        switch (request.type.toLowerCase()) {
          case 'page':
            pagesCount += request.pagesCompleted || 1
            break
          case 'blog':
            blogsCount += request.blogsCompleted || 1
            break
          case 'gbp_post':
          case 'gbp-post':
            gbpPostsCount += request.gbpPostsCompleted || 1
            break
          case 'improvement':
          case 'maintenance':
            improvementsCount += request.improvementsCompleted || 1
            break
        }
      }
      
      if (pagesCount > 0 || blogsCount > 0 || gbpPostsCount > 0 || improvementsCount > 0) {
        await prisma.dealerships.update({
          where: { id: dealership.id },
          data: {
            pagesUsedThisPeriod: pagesCount,
            blogsUsedThisPeriod: blogsCount,
            gbpPostsUsedThisPeriod: gbpPostsCount,
            improvementsUsedThisPeriod: improvementsCount
          }
        })
        
        console.log(`  ${dealership.name}: Pages=${pagesCount}, Blogs=${blogsCount}, GBP=${gbpPostsCount}, Improvements=${improvementsCount}`)
      }
    }
    
    // Final summary
    const finalStats = await prisma.dealerships.aggregate({
      _sum: {
        pagesUsedThisPeriod: true,
        blogsUsedThisPeriod: true,
        gbpPostsUsedThisPeriod: true,
        improvementsUsedThisPeriod: true
      }
    })
    
    console.log('\n=== RESET COMPLETE ===')
    console.log(`Dealerships created: ${createdDealerships.length}`)
    console.log(`Requests updated: ${requests.length}`)
    console.log(`Total usage across all dealerships:`)
    console.log(`  Pages: ${finalStats._sum.pagesUsedThisPeriod || 0}`)
    console.log(`  Blogs: ${finalStats._sum.blogsUsedThisPeriod || 0}`)
    console.log(`  GBP Posts: ${finalStats._sum.gbpPostsUsedThisPeriod || 0}`)
    console.log(`  Improvements: ${finalStats._sum.improvementsUsedThisPeriod || 0}`)
    
  } catch (error) {
    console.error('Error during reset:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the reset
resetAndInitDealerships()
  .then(() => {
    console.log('\nReset completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Reset failed:', error)
    process.exit(1)
  })