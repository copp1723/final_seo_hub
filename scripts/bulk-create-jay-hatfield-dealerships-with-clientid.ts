import { PrismaClient } from '@prisma/client'
import { DealershipData, generateClientId } from '../lib/dealership'

const prisma = new PrismaClient()

// All 22 dealerships with complete data
const dealerships: DealershipData[] = [
  {
    name: 'Jay Hatfield Chevrolet of Columbus',
    website: 'https://www.jayhatfieldchevy.net/',
    ga4PropertyId: '323480238',
    clientEmail: 'manager@jayhatfieldchevy.net'
  },
  {
    name: 'Jay Hatfield Chevrolet GMC of Chanute',
    website: 'https://www.jayhatfieldchanute.com/',
    ga4PropertyId: '323404832',
    clientEmail: 'manager@jayhatfieldchanute.com'
  },
  {
    name: 'Jay Hatfield Chevrolet GMC of Pittsburg',
    website: 'https://www.jayhatfieldchevroletgmc.com/',
    ga4PropertyId: '371672738',
    clientEmail: 'manager@jayhatfieldchevroletgmc.com'
  },
  {
    name: 'Jay Hatfield Chevrolet of Vinita',
    website: 'https://www.jayhatfieldchevroletvinita.com/',
    ga4PropertyId: '320759942',
    clientEmail: 'manager@jayhatfieldchevroletvinita.com'
  },
  {
    name: 'Jay Hatfield CDJR of Frontenac',
    website: 'https://www.jayhatfieldchryslerdodgejeepram.com/',
    ga4PropertyId: '323415736',
    clientEmail: 'manager@jayhatfieldchryslerdodgejeepram.com'
  },
  {
    name: 'Sarcoxie Ford',
    website: 'https://www.sarcoxieford.com',
    ga4PropertyId: '452793966',
    clientEmail: 'manager@sarcoxieford.com'
  },
  {
    name: 'Jay Hatfield Honda Powerhouse',
    website: 'https://www.jayhatfieldhondawichita.com/',
    ga4PropertyId: '336729443',
    clientEmail: 'manager@jayhatfieldhondawichita.com'
  },
  {
    name: 'Jay Hatfield Motorsports of Wichita',
    website: 'https://www.kansasmotorsports.com/',
    ga4PropertyId: '317592148',
    ga4MeasurementId: 'G-DBMQEB1TM0',
    clientEmail: 'manager@kansasmotorsports.com'
  },
  {
    name: 'Jay Hatfield Motorsports of Frontenac',
    website: 'https://www.jayhatfieldkawasaki.com/',
    ga4PropertyId: '317608467',
    clientEmail: 'manager@jayhatfieldkawasaki.com'
  },
  {
    name: 'Jay Hatfield Motorsports of Joplin',
    website: 'https://www.jhmofjoplin.com/',
    ga4PropertyId: '317578343',
    clientEmail: 'manager@jhmofjoplin.com'
  },
  {
    name: 'Acura of Columbus',
    website: 'https://www.acuracolumbus.com/',
    ga4PropertyId: '284944578',
    clientEmail: 'manager@acuracolumbus.com'
  },
  {
    name: 'Genesis of Wichita',
    website: 'https://www.genesisofwichita.com/',
    ga4PropertyId: '323502411',
    clientEmail: 'manager@genesisofwichita.com'
  },
  {
    name: 'Jay Hatfield Motorsports Portal',
    website: 'http://jayhatfieldmotorsports.com/',
    ga4PropertyId: '461644624',
    clientEmail: 'manager@jayhatfieldmotorsports.com'
  },
  {
    name: 'Jay Hatfield Motorsports Ottawa',
    website: 'https://www.jayhatfieldottawa.com/',
    ga4PropertyId: '472110523',
    clientEmail: 'manager@jayhatfieldottawa.com'
  },
  {
    name: 'Hatchett Hyundai East',
    website: 'https://www.hatchetthyundaieast.com/',
    ga4PropertyId: '323448557',
    clientEmail: 'manager@hatchetthyundaieast.com'
  },
  {
    name: 'Hatchett Hyundai West',
    website: 'https://www.hatchetthyundaiwest.com/',
    ga4PropertyId: '323465145',
    clientEmail: 'manager@hatchetthyundaiwest.com'
  },
  {
    name: 'Premier Mitsubishi',
    website: 'https://premiermitsubishi.com/',
    ga4PropertyId: '473660351',
    clientEmail: 'manager@premiermitsubishi.com'
  },
  {
    name: 'Premier Auto Center - Tucson',
    website: 'https://scottsaysyes.com/',
    ga4PropertyId: '470694371',
    clientEmail: 'manager@scottsaysyes.com'
  },
  {
    name: 'World Kia',
    website: 'https://www.worldkiajoliet.com/',
    clientEmail: 'manager@worldkiajoliet.com'
  },
  {
    name: 'AEO Powersports',
    website: 'https://aeopowersports.com/',
    clientEmail: 'manager@aeopowersports.com'
  },
  {
    name: 'Columbus Auto Group',
    website: 'https://columbusautogroup.com/',
    clientEmail: 'manager@columbusautogroup.com'
  },
  {
    name: 'Winnebago of Rockford',
    website: 'https://www.winnebagomotorhomes.com/',
    clientEmail: 'manager@winnebagomotorhomes.com'
  }
]

async function createDealershipsWithClientIds() {
  try {
    console.log('🔍 Finding SEOWorks agency...')
    
    // Find the SEOWorks agency
    const agency = await prisma.agencies.findFirst({
      where: {
        OR: [
          { name: { contains: 'SEO', mode: 'insensitive' } },
          { name: { contains: 'SEOWERKS', mode: 'insensitive' } },
          { domain: { contains: 'seowerks', mode: 'insensitive' } }
        ]
      }
    })

    if (!agency) {
      console.error('❌ SEOWorks agency not found! Please create the agency first.')
      console.log('\n🎯 To create the agency, run:')
      console.log('node scripts/create-seowerks-agency.js')
      return
    }

    console.log(`✅ Found agency: ${agency.name} (ID: ${agency.id})`)
    console.log(`📊 Creating ${dealerships.length} dealerships...`)
    
    let created = 0
    let updated = 0
    let errors = 0
    const results: any[] = []

    for (const dealershipData of dealerships) {
      try {
        // Generate unique clientId
        const clientId = generateClientId(dealershipData.name, dealershipData.website || '')
        
        console.log(`\n🏢 Processing: ${dealershipData.name}`)
        console.log(`   Client ID: ${clientId}`)

        // Check if dealership already exists (by name)
        const existing = await prisma.dealerships.findFirst({
          where: {
            name: dealershipData.name,
            agencyId: agency.id
          }
        })

        let dealership
        if (existing) {
          // Update existing dealership with clientId
          dealership = await prisma.dealerships.update({
            where: { id: existing.id },
            data: {
              clientId: clientId,
              website: dealershipData.website,
              settings: {
                ga4PropertyId: dealershipData.ga4PropertyId,
                ga4MeasurementId: dealershipData.ga4MeasurementId,
                clientEmail: dealershipData.clientEmail
              }
            }
          })
          console.log(`   ✅ Updated existing dealership`)
          updated++
        } else {
          // Create new dealership
          dealership = await prisma.dealerships.create({
            data: {
              name: dealershipData.name,
              website: dealershipData.website,
              agencyId: agency.id,
              clientId: clientId,
              settings: {
                ga4PropertyId: dealershipData.ga4PropertyId,
                ga4MeasurementId: dealershipData.ga4MeasurementId,
                clientEmail: dealershipData.clientEmail
              }
              ,
              updatedAt: new Date()
            }
          })
          console.log(`   ✅ Created new dealership`)
          created++
        }

        results.push({
          id: dealership.id,
          name: dealership.name,
          clientId: dealership.clientId,
          website: dealership.website,
          ga4PropertyId: dealershipData.ga4PropertyId,
          ga4MeasurementId: dealershipData.ga4MeasurementId,
          clientEmail: dealershipData.clientEmail
        })

        // Create GA4 connection record if GA4 property ID is provided
        if (dealershipData.ga4PropertyId) {
          const existingConnection = await prisma.ga4_connections.findFirst({
            where: { 
              dealershipId: dealership.id 
            }
          })

          if (!existingConnection) {
            // Note: We need a user ID for GA4 connections, so we'll create a placeholder
            // This will need to be updated when actual users are assigned
            console.log(`   📊 GA4 property ready: ${dealershipData.ga4PropertyId}`)
          }
        }

      } catch (error) {
        console.error(`❌ Error processing ${dealershipData.name}:`, error)
        errors++
      }
    }

    console.log(`\n🎉 Bulk creation complete!`)
    console.log(`📊 Summary:`)
    console.log(`   ✅ Created: ${created} dealerships`)
    console.log(`   🔄 Updated: ${updated} dealerships`)
    console.log(`   ❌ Errors: ${errors}`)
    console.log(`   📋 Total: ${results.length} dealerships`)

    console.log(`\n📋 SEOWorks Client ID Mapping:`)
    console.log(`${'Dealership Name'.padEnd(40)} | ${'Client ID'.padEnd(35)} | ${'GA4 Property ID'.padEnd(15)} | Website`)
    console.log('-'.repeat(120))
    
    results.forEach(r => {
      const name = r.name.length > 37 ? r.name.substring(0, 37) + '...' : r.name
      console.log(`${name.padEnd(40)} | ${r.clientId.padEnd(35)} | ${(r.ga4PropertyId || 'N/A').padEnd(15)} | ${r.website}`)
    })

    console.log(`\n🔗 SEOWorks Integration Instructions:`)
    console.log(`1. Use the Client IDs above in your webhook payloads`)
    console.log(`2. Example webhook payload:`)
    console.log(`{`)
    console.log(`  "clientId": "user_jayhatfieldmotors_wichita_2024",`)
    console.log(`  "clientEmail": "manager@kansasmotorsports.com",`)
    console.log(`  "businessName": "Jay Hatfield Motorsports of Wichita",`)
    console.log(`  "websiteUrl": "https://www.kansasmotorsports.com",`)
    console.log(`  "ga4PropertyId": "317592148",`)
    console.log(`  "ga4MeasurementId": "G-DBMQEB1TM0"`)
    console.log(`}`)

    return results

  } catch (error) {
    console.error('❌ Fatal error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
createDealershipsWithClientIds()
  .then((results) => {
    if (results) {
      console.log(`\n✅ All done! Your dropdown will now show all ${results.length} dealerships!`)
    }
  })
  .catch(console.error)

export default createDealershipsWithClientIds