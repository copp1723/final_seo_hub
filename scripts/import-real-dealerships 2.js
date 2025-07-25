const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function importRealDealerships() {
  console.log('🏢 Importing 22 real dealerships from CSV data...\n')
  
  try {
    // Find SEOWorks agency
    const agency = await prisma.agencies.findFirst({
      where: { id: 'agency-seowerks' }
    })
    
    if (!agency) {
      console.log('❌ SEOWorks agency not found!')
      return
    }
    
    console.log(`✅ Found agency: ${agency.name} (${agency.id})`)
    
    // Find agency admin user for connections
    const agencyAdmin = await prisma.users.findFirst({
      where: { agencyId: agency.id, role: 'AGENCY_ADMIN' }
    })
    
    if (!agencyAdmin) {
      console.log('❌ Agency admin not found!')
      return
    }
    
    console.log(`✅ Found agency admin: ${agencyAdmin.email}`)
    
    // Dealership data from CSV
    const dealershipData = [
      { name: 'Jay Hatfield Chevrolet of Columbus', website: 'https://www.jayhatfieldchevrolet.com/', ga4Id: '323480238' },
      { name: 'Jay Hatfield Chevrolet GMC of Chanute', website: 'https://www.jayhatfieldchevroletgmc.com/', ga4Id: '323404832' },
      { name: 'Jay Hatfield Chevrolet GMC of Pittsburg', website: 'https://www.jayhatfieldchevroletgmcofpittsburg.com/', ga4Id: '371672738' },
      { name: 'Jay Hatfield Chevrolet of Vinita', website: 'https://www.jayhatfieldchevroletvinita.com/', ga4Id: '320759942' },
      { name: 'Jay Hatfield CDJR of Frontenac', website: 'https://www.jayhatfieldcdjrof.com/', ga4Id: '323415736' },
      { name: 'Sarcoxie Ford', website: 'https://www.sarcoxieford.com/', ga4Id: '452793966' },
      { name: 'Jay Hatfield Honda Powerhouse', website: 'https://www.jayhatfieldhondapowerhouse.com/', ga4Id: '336729443' },
      { name: 'Jay Hatfield Motorsports of Wichita', website: 'https://www.jayhatfieldmotorsportsofwichita.com/', ga4Id: '317592148' },
      { name: 'Jay Hatfield Motorsports of Frontenac', website: 'https://www.jayhatfieldmotorsportsoffrontenac.com/', ga4Id: '317608467' },
      { name: 'Jay Hatfield Motorsports of Joplin', website: 'https://www.jayhatfieldmotorsportsofjoplin.com/', ga4Id: '317578343' },
      { name: 'Acura of Columbus', website: 'https://www.acuraofcolumbus.com/', ga4Id: '284944578' },
      { name: 'Genesis of Wichita', website: 'https://www.genesisofwichita.com/', ga4Id: '323502411' },
      { name: 'Jay Hatfield Motorsports Portal', website: 'https://jayhatfieldmotorsportsportal.com/', ga4Id: '461644624' },
      { name: 'Jay Hatfield Motorsports Ottawa', website: 'https://jayhatfieldmotorsportsottawa.com/', ga4Id: '472110523' },
      { name: 'Hatchett Hyundai East', website: 'https://www.hatchett.com/', ga4Id: '323448557' },
      { name: 'Hatchett Hyundai West', website: 'https://www.hatchettwest.com/', ga4Id: '323465145' },
      { name: 'Premier Mitsubishi', website: 'https://www.premiermitsubishi.com/', ga4Id: '473660351' },
      { name: 'Premier Auto Center - Tucson', website: 'https://www.premierautocentertucson.com/', ga4Id: '470694371' },
      { name: 'World Kia', website: 'https://www.worldkia.com/', ga4Id: null },
      { name: 'AEO Powersports', website: 'https://www.aeopowersports.com/', ga4Id: null },
      { name: 'Columbus Auto Group', website: 'https://www.columbusautogroup.com/', ga4Id: null },
      { name: 'Winnebago of Rockford', website: 'https://winnebagoofrockford.com/', ga4Id: null }
    ]
    
    console.log('Importing dealerships...')
    
    for (const dealer of dealershipData) {
      // Create dealership
      const createdDealership = await prisma.dealerships.create({
        data: {
          name: dealer.name,
          website: dealer.website,
          agencyId: agency.id
        }
      })
      
      console.log(`✅ Created: ${dealer.name} (${createdDealership.id})`)
      
      // Create user for this dealership
      const dealershipUser = await prisma.users.create({
        data: {
          id: `user-${createdDealership.id}`,
          name: `${dealer.name} Admin`,
          email: `admin@${dealer.name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')}.demo`,
          role: 'DEALERSHIP_ADMIN',
          agencyId: agency.id,
          dealershipId: createdDealership.id,
          updatedAt: new Date()
        }
      })
      
      console.log(`   ✅ Created user: ${dealershipUser.email}`)
      
      // Create GA4 connection if ID exists
      if (dealer.ga4Id) {
        await prisma.ga4_connections.create({
          data: {
            userId: dealershipUser.id,
            dealershipId: createdDealership.id,
            propertyId: dealer.ga4Id,
            propertyName: `${dealer.name} GA4 Property`,
            accessToken: 'demo-token',
            refreshToken: 'demo-refresh',
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })
        console.log(`   ✅ Added GA4: ${dealer.ga4Id}`)
      }
      
      // Add placeholder Search Console
      await prisma.search_console_connections.create({
        data: {
          userId: dealershipUser.id,
          siteUrl: dealer.website,
          siteName: dealer.name,
          accessToken: 'demo-token',
          refreshToken: 'demo-refresh',
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      console.log(`   ✅ Added Search Console: ${dealer.website}`)
    }
    
    console.log('\n🎉 All 22 dealerships imported successfully!')
    console.log('   - GA4 connections added for 18 dealerships')
    console.log('   - Search Console placeholders added for all')
    console.log('   - All assigned to SEOWorks agency')
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

importRealDealerships()