import { prisma } from '../lib/prisma'
import { DealershipData } from '../lib/dealership'

const dealerships: DealershipData[] = [
  {
    name: "Example Dealership 1",
    website: "https://example1.com",
    ga4PropertyId: "123456789", // Replace with actual GA4 property ID
    searchConsoleUrl: "https://example1.com"
  },
  // Add your other 23 dealerships here..
]

async function createDealerships(agencyId: string) {
  console.log(`Creating ${dealerships.length} dealerships for agency ${agencyId}...`)
  
  for (const dealership of dealerships) {
    try {
      const created = await prisma.dealerships.create({
        data: {
          name: dealership.name,
          website: dealership.website,
          agencyId: agencyId
          ,
          updatedAt: new Date()
        }
      })
      
      console.log(`✅ Created dealership: ${dealership.name} (ID: ${created.id})`)
      
      // Note: GA4 and Search Console connections require a userId
      // These connections should be created when a user actually connects their accounts
      // Skipping automatic connection creation for now
      if (dealership.ga4PropertyId) {
        console.log(`  📊 GA4 property ready to connect: ${dealership.ga4PropertyId}`)
      }
      
      if (dealership.searchConsoleUrl) {
        console.log(`  🔍 Search Console site ready to connect: ${dealership.searchConsoleUrl}`)
      }
      
    } catch (error) {
      console.error(`❌ Failed to create dealership ${dealership.name}:`, error)
    }
  }
  
  console.log('✅ Bulk creation completed!')
}

// Usage: node -r ts-node/register scripts/bulk-create-dealerships.ts YOUR_AGENCY_ID
const agencyId = process.argv[2]
if (!agencyId) {
  console.error('Please provide agency ID as argument')
  process.exit(1)
}

createDealerships(agencyId)
  .catch(console.error)
 .finally(() => prisma.$disconnect())
