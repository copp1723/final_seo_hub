import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface DealershipData {
  name: string
  website?: string
  ga4PropertyId?: string
  searchConsoleUrl?: string
}

// Replace this array with your dealerships data
const dealerships: DealershipData[] = [
    {
      name: 'Jay Hatfield Chevrolet of Columbus',
      website: 'https://www.jayhatfieldchevy.net/',
      ga4PropertyId: '323480238',
      searchConsoleUrl: 'https://www.jayhatfieldchevy.net/'
    },
    {
      name: 'Jay Hatfield Chevrolet GMC of Chanute',
      website: 'https://www.jayhatfieldchanute.com/',
      ga4PropertyId: '323404832',
      searchConsoleUrl: 'https://www.jayhatfieldchanute.com/'
    },
    {
      name: 'Jay Hatfield Chevrolet GMC of Pittsburg',
      website: 'https://www.jayhatfieldchevroletgmc.com/',
      ga4PropertyId: '371672738',
      searchConsoleUrl: 'https://www.jayhatfieldchevroletgmc.com/'
    },
    {
      name: 'Jay Hatfield Chevrolet of Vinita',
      website: 'https://www.jayhatfieldchevroletvinita.com/',
      ga4PropertyId: '320759942',
      searchConsoleUrl: 'https://www.jayhatfieldchevroletvinita.com/'
    },
    {
      name: 'Jay Hatfield CDJR of Frontenac',
      website: 'https://www.jayhatfieldchryslerdodgejeepram.com/',
      ga4PropertyId: '323415736',
      searchConsoleUrl: 'https://www.jayhatfieldchryslerdodgejeepram.com/'
    },
    {
      name: 'Sarcoxie Ford',
      website: 'https://www.sarcoxieford.com',
      ga4PropertyId: '452793966',
      searchConsoleUrl: 'https://www.sarcoxieford.com'
    },
    {
      name: 'Jay Hatfield Honda Powerhouse',
      website: 'https://www.jayhatfieldhondawichita.com/',
      ga4PropertyId: '336729443',
      searchConsoleUrl: 'https://www.jayhatfieldhondawichita.com/'
    },
    {
      name: 'Jay Hatfield Motorsports of Wichita',
      website: 'https://www.kansasmotorsports.com/',
      ga4PropertyId: '317592148',
      searchConsoleUrl: 'https://www.kansasmotorsports.com/'
    },
    {
      name: 'Jay Hatfield Motorsports of Frontenac',
      website: 'https://www.jayhatfieldkawasaki.com/',
      ga4PropertyId: '317608467',
      searchConsoleUrl: 'https://www.jayhatfieldkawasaki.com/'
    },
    {
      name: 'Jay Hatfield Motorsports of Joplin',
      website: 'https://www.jhmofjoplin.com/',
      ga4PropertyId: '317578343',
      searchConsoleUrl: 'https://www.jhmofjoplin.com/'
    },
    {
      name: 'Acura of Columbus',
      website: 'https://www.acuracolumbus.com/',
      ga4PropertyId: '284944578',
      searchConsoleUrl: 'https://www.acuracolumbus.com/'
    },
    {
      name: 'Genesis of Wichita',
      website: 'https://www.genesisofwichita.com/',
      ga4PropertyId: '323502411',
      searchConsoleUrl: 'https://www.genesisofwichita.com/'
    },
    {
      name: 'Jay Hatfield Motorsports Portal',
      website: 'http://jayhatfieldmotorsports.com/',
      ga4PropertyId: '461644624',
      searchConsoleUrl: 'http://jayhatfieldmotorsports.com/'
    },
    {
      name: 'Jay Hatfield Motorsports Ottawa',
      website: 'https://www.jayhatfieldottawa.com/',
      ga4PropertyId: '472110523',
      searchConsoleUrl: 'https://www.jayhatfieldottawa.com/'
    },
    {
      name: 'Hatchett Hyundai East',
      website: 'https://www.hatchetthyundaieast.com/',
      ga4PropertyId: '323448557',
      searchConsoleUrl: 'https://www.hatchetthyundaieast.com/'
    },
    {
      name: 'Hatchett Hyundai West',
      website: 'https://www.hatchetthyundaiwest.com/',
      ga4PropertyId: '323465145',
      searchConsoleUrl: 'https://www.hatchetthyundaiwest.com/'
    },
    {
      name: 'Premier Mitsubishi',
      website: 'https://premiermitsubishi.com/',
      ga4PropertyId: '473660351',
      searchConsoleUrl: 'https://premiermitsubishi.com/'
    },
    {
      name: 'Premier Auto Center - Tucson',
      website: 'https://scottsaysyes.com/',
      ga4PropertyId: '470694371',
      searchConsoleUrl: 'https://scottsaysyes.com/'
    }
  ]

async function createDealerships(agencyId: string) {
  const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
  if (!agency) {
    console.error(`Agency with ID ${agencyId} not found.`);
    return;
  }

  console.log(`Using agency: ${agency.name} (ID: ${agency.id})`)

  let created = 0
  let errors = 0

  for (const dealershipData of dealerships) {
    try {
      // Check if dealership already exists
      const existing = await prisma.dealership.findFirst({
        where: {
          name: dealershipData.name,
          agencyId: agency.id
        }
      })

      if (existing) {
        console.log(`⚠️  Dealership already exists: ${dealershipData.name}`)
        continue
      }

      // Create the dealership
      const dealership = await prisma.dealership.create({
        data: {
          name: dealershipData.name,
          website: dealershipData.website,
          agencyId: agency.id,
          settings: {}
        }
      })

      console.log(`✅ Created dealership: ${dealership.name} (ID: ${dealership.id})`)

      // Create GA4 connection record (not connected yet, just the record)
      if (dealershipData.ga4PropertyId) {
        await prisma.gA4Connection.create({
          data: {
            dealershipId: dealership.id,
            propertyId: dealershipData.ga4PropertyId,
            propertyName: `${dealership.name} - GA4`,
            // OAuth tokens will be added when user connects
          }
        })
        console.log(`   📊 GA4 property ID set: ${dealershipData.ga4PropertyId}`)
      }

      // Create Search Console connection record (not connected yet, just the record)
      if (dealershipData.searchConsoleUrl) {
        await prisma.searchConsoleConnection.create({
          data: {
            dealershipId: dealership.id,
            siteUrl: dealershipData.searchConsoleUrl,
            siteName: `${dealership.name} - Search Console`,
            // OAuth tokens will be added when user connects
          }
        })
        console.log(`   🔍 Search Console URL set: ${dealershipData.searchConsoleUrl}`)
      }

      created++
    } catch (error) {
      console.error(`❌ Error creating ${dealershipData.name}:`, error)
      errors++
    }
  }

  console.log(`\n📋 Summary:`)
  console.log(`   ✅ Created: ${created} dealerships`)
  console.log(`   ❌ Errors: ${errors}`)
  console.log(`   ⚠️  Skipped: ${dealerships.length - created - errors} (already exist)`)
  
  console.log(`\n🔗 Next steps:`)
  console.log(`   1. Go to each dealership's settings page`)
  console.log(`   2. Click "Connect GA4" and authorize with your Google account`)
  console.log(`   3. The correct property will be pre-selected based on the property ID`)
  console.log(`   4. Do the same for Search Console`)
}

// Usage: ts-node scripts/bulk-create-dealerships.ts <agency_id>
const agencyId = process.argv[2]
if (!agencyId) {
  console.error('Please provide an agency ID as a command-line argument.')
  process.exit(1)
}

createDealerships(agencyId)
  .catch(console.error)
  .finally(() => prisma.$disconnect())