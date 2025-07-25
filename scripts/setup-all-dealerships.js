const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const dealerships = [
  // Jay Hatfield Chevrolet locations
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
  
  // Ford dealership
  {
    id: 'dealer-sarcoxie-ford',
    name: 'Sarcoxie Ford',
    website: 'https://www.sarcoxieford.com',
    ga4PropertyId: '452793966',
    userEmail: 'manager@sarcoxieford.com',
    userName: 'Sarcoxie Ford Manager'
  },
  
  // Honda dealership
  {
    id: 'dealer-jay-hatfield-honda',
    name: 'Jay Hatfield Honda Powerhouse',
    website: 'https://www.jayhatfieldhondawichita.com/',
    ga4PropertyId: '336729443',
    userEmail: 'honda@jayhatfield.com',
    userName: 'Honda Manager'
  },
  
  // Motorsports locations
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
  
  // Luxury brands
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
  
  // Hatchett Hyundai locations
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
  
  // Premier brands
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
  
  // Other brands
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
  console.log('🚗 Setting up Multi-Brand Auto Group dealerships...')

  // First, find the agency (or create one if it doesn't exist)
  let agency = await prisma.agencies.findFirst({
    where: {
      OR: [
        { name: { contains: 'Hatfield' } },
        { name: { contains: 'Auto Group' } }
      ]
    }
  })

  if (!agency) {
    console.log('📍 Creating Multi-Brand Auto Group agency...')
    agency = await prisma.agencies.create({
      data: {
        id: 'agency-multi-brand-auto-group',
        name: 'Multi-Brand Auto Group',
        slug: 'multi-brand-auto-group',
        domain: 'autogroup.com',
        updatedAt: new Date()
      }
    })
    console.log(`✅ Created agency: ${agency.name} (ID: ${agency.id})`)
  } else {
    console.log(`✅ Found existing agency: ${agency.name} (ID: ${agency.id})`)
  }

  // Create agency admin if it doesn't exist
  let agencyAdmin = await prisma.users.findFirst({
    where: {
      agencyId: agency.id,
      role: 'ADMIN'
    }
  })

  if (!agencyAdmin) {
    console.log('👤 Creating agency admin user...')
    agencyAdmin = await prisma.users.create({
      data: {
        id: 'user-admin-auto-group',
        email: 'admin@autogroup.com',
        name: 'Auto Group Admin',
        role: 'ADMIN',
        agencyId: agency.id,
        emailVerified: new Date(),
        updatedAt: new Date()
      }
    })
    console.log(`✅ Created agency admin: ${agencyAdmin.email}`)
  }

  // Create dealerships and users
  const results = []
  
  for (const dealershipData of dealerships) {
    try {
      // Note: This schema doesn't have a dealerships table, so we'll create users directly
      // and store dealership info in the user record for now
      const dealership = {
        id: dealershipData.id,
        name: dealershipData.name,
        website: dealershipData.website
      }

      // Create user for dealership
      const user = await prisma.users.upsert({
        where: { email: dealershipData.userEmail },
        create: {
          id: `user-${dealershipData.id}`,
          email: dealershipData.userEmail,
          name: `${dealershipData.userName} (${dealershipData.name})`,
          role: 'USER',
          agencyId: agency.id,
          emailVerified: new Date(),
          updatedAt: new Date()
        },
        update: {
          name: `${dealershipData.userName} (${dealershipData.name})`,
          updatedAt: new Date()
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
  console.log(`\n📊 Created ${results.length} dealerships across multiple brands`)
  console.log(`🏢 Agency: ${agency.name} (ID: ${agency.id})`)
  console.log(`👤 Agency Admin: admin@autogroup.com`)
  
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