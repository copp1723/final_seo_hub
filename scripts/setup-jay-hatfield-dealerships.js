const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const dealerships = [
  {
    id: 'dealer-jay-hatfield-columbus',
    name: 'Jay Hatfield Chevrolet of Columbus',
    website: 'https://www.jayhatfieldchevy.net/',
    ga4PropertyId: '323480238',
    userEmail: 'columbus@jayhatfield.com',
    userName: 'Columbus Manager'
  },
  {
    id: 'dealer-jay-hatfield-chanute',
    name: 'Jay Hatfield Chevrolet GMC of Chanute',
    website: 'https://www.jayhatfieldchanute.com/',
    ga4PropertyId: '323404832',
    userEmail: 'chanute@jayhatfield.com',
    userName: 'Chanute Manager'
  },
  {
    id: 'dealer-jay-hatfield-pittsburg',
    name: 'Jay Hatfield Chevrolet GMC of Pittsburg',
    website: 'https://www.jayhatfieldchevroletgmc.com/',
    ga4PropertyId: '371672738',
    userEmail: 'pittsburg@jayhatfield.com',
    userName: 'Pittsburg Manager'
  },
  {
    id: 'dealer-jay-hatfield-vinita',
    name: 'Jay Hatfield Chevrolet of Vinita',
    website: 'https://www.jayhatfieldchevroletvinita.com/',
    ga4PropertyId: '320759942',
    userEmail: 'vinita@jayhatfield.com',
    userName: 'Vinita Manager'
  },
  {
    id: 'dealer-jay-hatfield-frontenac-cdjr',
    name: 'Jay Hatfield CDJR of Frontenac',
    website: 'https://www.jayhatfieldchryslerdodgejeepram.com/',
    ga4PropertyId: '323415736',
    userEmail: 'frontenac.cdjr@jayhatfield.com',
    userName: 'Frontenac CDJR Manager'
  },
  {
    id: 'dealer-sarcoxie-ford',
    name: 'Sarcoxie Ford',
    website: 'https://www.sarcoxieford.com',
    ga4PropertyId: '452793966',
    userEmail: 'manager@sarcoxieford.com',
    userName: 'Sarcoxie Ford Manager'
  },
  {
    id: 'dealer-jay-hatfield-honda',
    name: 'Jay Hatfield Honda Powerhouse',
    website: 'https://www.jayhatfieldhondawichita.com/',
    ga4PropertyId: '336729443',
    userEmail: 'honda@jayhatfield.com',
    userName: 'Honda Manager'
  },
  {
    id: 'dealer-jay-hatfield-motorsports-wichita',
    name: 'Jay Hatfield Motorsports of Wichita',
    website: 'https://www.kansasmotorsports.com/',
    ga4PropertyId: '317592148',
    userEmail: 'motorsports.wichita@jayhatfield.com',
    userName: 'Wichita Motorsports Manager'
  },
  {
    id: 'dealer-jay-hatfield-motorsports-frontenac',
    name: 'Jay Hatfield Motorsports of Frontenac',
    website: 'https://www.jayhatfieldkawasaki.com/',
    ga4PropertyId: '317608467',
    userEmail: 'motorsports.frontenac@jayhatfield.com',
    userName: 'Frontenac Motorsports Manager'
  },
  {
    id: 'dealer-jay-hatfield-motorsports-joplin',
    name: 'Jay Hatfield Motorsports of Joplin',
    website: 'https://www.jhmofjoplin.com/',
    ga4PropertyId: '317578343',
    userEmail: 'motorsports.joplin@jayhatfield.com',
    userName: 'Joplin Motorsports Manager'
  },
  {
    id: 'dealer-acura-columbus',
    name: 'Acura of Columbus',
    website: 'https://www.acuracolumbus.com/',
    ga4PropertyId: '284944578',
    userEmail: 'manager@acuracolumbus.com',
    userName: 'Acura Columbus Manager'
  },
  {
    id: 'dealer-genesis-wichita',
    name: 'Genesis of Wichita',
    website: 'https://www.genesisofwichita.com/',
    ga4PropertyId: '323502411',
    userEmail: 'manager@genesisofwichita.com',
    userName: 'Genesis Wichita Manager'
  },
  {
    id: 'dealer-jay-hatfield-motorsports-portal',
    name: 'Jay Hatfield Motorsports Portal',
    website: 'http://jayhatfieldmotorsports.com/',
    ga4PropertyId: '461644624',
    userEmail: 'motorsports.portal@jayhatfield.com',
    userName: 'Portal Motorsports Manager'
  },
  {
    id: 'dealer-jay-hatfield-motorsports-ottawa',
    name: 'Jay Hatfield Motorsports Ottawa',
    website: 'https://www.jayhatfieldottawa.com/',
    ga4PropertyId: '472110523',
    userEmail: 'motorsports.ottawa@jayhatfield.com',
    userName: 'Ottawa Motorsports Manager'
  },
  {
    id: 'dealer-hatchett-hyundai-east',
    name: 'Hatchett Hyundai East',
    website: 'https://www.hatchetthyundaieast.com/',
    ga4PropertyId: '323448557',
    userEmail: 'east@hatchetthyundai.com',
    userName: 'Hatchett East Manager'
  },
  {
    id: 'dealer-hatchett-hyundai-west',
    name: 'Hatchett Hyundai West',
    website: 'https://www.hatchetthyundaiwest.com/',
    ga4PropertyId: '323465145',
    userEmail: 'west@hatchetthyundai.com',
    userName: 'Hatchett West Manager'
  },
  {
    id: 'dealer-premier-mitsubishi',
    name: 'Premier Mitsubishi',
    website: 'https://premiermitsubishi.com/',
    ga4PropertyId: '473660351',
    userEmail: 'manager@premiermitsubishi.com',
    userName: 'Premier Mitsubishi Manager'
  },
  {
    id: 'dealer-premier-auto-tucson',
    name: 'Premier Auto Center - Tucson',
    website: 'https://scottsaysyes.com/',
    ga4PropertyId: '470694371',
    userEmail: 'manager@scottsaysyes.com',
    userName: 'Premier Auto Tucson Manager'
  },
  {
    id: 'dealer-world-kia',
    name: 'World Kia',
    website: 'https://www.worldkiajoliet.com/',
    ga4PropertyId: null,
    ga4Status: 'no access',
    userEmail: 'manager@worldkiajoliet.com',
    userName: 'World Kia Manager'
  },
  {
    id: 'dealer-aeo-powersports',
    name: 'AEO Powersports',
    website: 'https://aeopowersports.com/',
    ga4PropertyId: null,
    ga4Status: 'no access yet',
    userEmail: 'manager@aeopowersports.com',
    userName: 'AEO Powersports Manager'
  },
  {
    id: 'dealer-columbus-auto-group',
    name: 'Columbus Auto Group',
    website: 'https://columbusautogroup.com/',
    ga4PropertyId: null,
    ga4Status: 'no access (pending name change?)',
    userEmail: 'manager@columbusautogroup.com',
    userName: 'Columbus Auto Group Manager'
  },
  {
    id: 'dealer-winnebago-rockford',
    name: 'Winnebago of Rockford',
    website: 'https://www.winnebagomotorhomes.com/',
    ga4PropertyId: null,
    ga4Status: 'not launched',
    userEmail: 'manager@winnebagomotorhomes.com',
    userName: 'Winnebago Rockford Manager'
  }
]

async function main() {
  console.log('🚗 Setting up Jay Hatfield Auto Group dealerships...')

  // First, find the agency (or create one if it doesn't exist)
  let agency = await prisma.agency.findFirst({
    where: {
      name: {
        contains: 'Hatfield'
      }
    }
  })

  if (!agency) {
    console.log('📍 Creating Jay Hatfield Auto Group agency...')
    agency = await prisma.agency.create({
      data: {
        name: 'Jay Hatfield Auto Group',
        domain: 'jayhatfield.com',
        settings: {
          branding: {
            primaryColor: '#1f2937',
            logoUrl: null
          },
          features: {
            multiDealership: true,
            customReporting: true
          }
        }
      }
    })
    console.log(`✅ Created agency: ${agency.name} (ID: ${agency.id})`)
  } else {
    console.log(`✅ Found existing agency: ${agency.name} (ID: ${agency.id})`)
  }

  // Create agency admin if it doesn't exist
  let agencyAdmin = await prisma.user.findFirst({
    where: {
      agencyId: agency.id,
      role: 'AGENCY_ADMIN'
    }
  })

  if (!agencyAdmin) {
    console.log('👤 Creating agency admin user...')
    agencyAdmin = await prisma.user.create({
      data: {
        email: 'admin@jayhatfield.com',
        name: 'Jay Hatfield Admin',
        role: 'AGENCY_ADMIN',
        agencyId: agency.id,
        onboardingCompleted: true,
        emailVerified: new Date()
      }
    })
    console.log(`✅ Created agency admin: ${agencyAdmin.email}`)
  }

  // Create dealerships and users
  const results = []
  
  for (const dealershipData of dealerships) {
    try {
      // Create dealership
      const dealership = await prisma.dealership.upsert({
        where: { id: dealershipData.id },
        create: {
          id: dealershipData.id,
          name: dealershipData.name,
          website: dealershipData.website,
          agencyId: agency.id,
          settings: dealershipData.ga4PropertyId ? 
            { ga4PropertyId: dealershipData.ga4PropertyId } : 
            { ga4PropertyId: null, ga4Status: dealershipData.ga4Status }
        },
        update: {
          name: dealershipData.name,
          website: dealershipData.website,
          settings: dealershipData.ga4PropertyId ? 
            { ga4PropertyId: dealershipData.ga4PropertyId } : 
            { ga4PropertyId: null, ga4Status: dealershipData.ga4Status }
        }
      })

      // Create user for dealership
      const user = await prisma.user.upsert({
        where: { email: dealershipData.userEmail },
        create: {
          email: dealershipData.userEmail,
          name: dealershipData.userName,
          role: 'DEALERSHIP_ADMIN',
          agencyId: agency.id,
          dealershipId: dealership.id,
          onboardingCompleted: true,
          emailVerified: new Date()
        },
        update: {
          name: dealershipData.userName,
          dealershipId: dealership.id
        }
      })

      results.push({
        dealership: dealership.name,
        dealershipId: dealership.id,
        userId: user.id,
        userEmail: user.email,
        ga4PropertyId: dealershipData.ga4PropertyId
      })

      console.log(`✅ ${dealership.name}`)

    } catch (error) {
      console.error(`❌ Failed to create ${dealershipData.name}:`, error.message)
    }
  }

  console.log('\n🎉 Setup complete!')
  console.log(`\n📊 Created ${results.length} dealerships`)
  console.log(`🏢 Agency: ${agency.name} (ID: ${agency.id})`)
  console.log(`👤 Agency Admin: admin@jayhatfield.com`)
  
  console.log('\n📋 SEOWorks Client ID Mapping:')
  console.log('Dealership Name | User ID | Email | GA4 Property ID')
  console.log('---')
  results.forEach(r => {
    console.log(`${r.dealership} | ${r.userId} | ${r.userEmail} | ${r.ga4PropertyId || 'N/A'}`)
  })

  return results
}

main()
  .catch((e) => {
    console.error('❌ Setup failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })