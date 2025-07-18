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
        }
      })
      
      console.log(`✅ Created dealership: ${dealership.name} (ID: ${created.id})`)
      
      // If GA4 property ID is provided, create the connection record
      if (dealership.ga4PropertyId) {
        await prisma.ga4_connections.create({
          data: {
            dealershipId: created.id,
            propertyId: dealership.ga4PropertyId,
            propertyName: dealership.name + " - GA4",
            accessToken: '',
            users: {
              connect: { id: 'placeholder' }
            }
            // Note: accessToken and refreshToken will be set when user connects
          }
        })
        console.log(`  📊 Added GA4 property: ${dealership.ga4PropertyId}`)
      }
      
      // If Search Console URL is provided, create the connection record
      if (dealership.searchConsoleUrl) {
        await prisma.search_console_connections.create({
          data: {
            dealershipId: created.id,
            siteUrl: dealership.searchConsoleUrl,
            siteName: dealership.name + " - Search Console",
            accessToken: '',
            users: {
              connect: { id: 'placeholder' }
            }
            // Note: accessToken and refreshToken will be set when user connects
          }
        })
        console.log(`  🔍 Added Search Console site: ${dealership.searchConsoleUrl}`)
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
