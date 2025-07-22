import { PrismaClient, RequestStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function populateUsageCounters() {
  console.log('Starting usage counter population...')
  
  try {
    // Get all dealerships
    const dealerships = await prisma.dealerships.findMany()
    
    console.log(`Processing ${dealerships.length} dealerships...`)
    
    for (const dealership of dealerships) {
      // Get completed requests for this dealership
      const requests = await prisma.requests.findMany({
        where: {
          dealershipId: dealership.id,
          status: RequestStatus.COMPLETED
        }
      })
      
      if (requests.length === 0) {
        continue
      }
      
      console.log(`\nProcessing ${dealership.name} with ${requests.length} completed requests`)
      
      // Count completed requests by type within the current billing period
      let pagesCount = 0
      let blogsCount = 0
      let gbpPostsCount = 0
      let improvementsCount = 0
      
      for (const request of requests) {
        // Only count requests completed within the current billing period
        if (dealership.currentBillingPeriodStart && dealership.currentBillingPeriodEnd) {
          const completedAt = request.completedAt || request.updatedAt
          
          if (completedAt >= dealership.currentBillingPeriodStart && 
              completedAt <= dealership.currentBillingPeriodEnd) {
            
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
        }
      }
      
      // Update dealership usage counters
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
        
        console.log(`  Updated usage: Pages=${pagesCount}, Blogs=${blogsCount}, GBP Posts=${gbpPostsCount}, Improvements=${improvementsCount}`)
      }
    }
    
    // Verify the updates
    const dealershipsWithUsage = await prisma.dealerships.count({
      where: {
        OR: [
          { pagesUsedThisPeriod: { gt: 0 } },
          { blogsUsedThisPeriod: { gt: 0 } },
          { gbpPostsUsedThisPeriod: { gt: 0 } },
          { improvementsUsedThisPeriod: { gt: 0 } }
        ]
      }
    })
    
    console.log(`\nUsage counter population complete!`)
    console.log(`Dealerships with usage data: ${dealershipsWithUsage}`)
    
  } catch (error) {
    console.error('Error populating usage counters:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the migration
populateUsageCounters()
  .then(() => {
    console.log('Migration completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Migration failed:', error)
    process.exit(1)
  })