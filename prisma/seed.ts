import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create or update super admin user (Josh)
  const superAdmin = await prisma.users.upsert({
    where: { email: 'josh.copp@onekeel.ai' },
    update: {
      role: 'SUPER_ADMIN',
      name: 'Josh Copp',
      updatedAt: new Date()
    },
    create: {
      id: crypto.randomUUID(),
      email: 'josh.copp@onekeel.ai',
      name: 'Josh Copp',
      role: 'SUPER_ADMIN',
      updatedAt: new Date()
    }
  })
  console.log('✅ Super admin user created:', superAdmin.email)

  // Create sample agency for testing
  const sampleAgency = await prisma.agencies.upsert({
    where: { id: 'agency-sample-001' },
    update: {
      updatedAt: new Date()
    },
    create: {
      id: 'agency-sample-001',
      name: 'Sample Auto Agency',
      slug: 'sample-auto-agency',
      domain: 'sample-auto.com',
      updatedAt: new Date()
    }
  })
  console.log('✅ Sample agency created:', sampleAgency.name)

  // Create sample dealerships under the agency
  const dealership1 = await prisma.dealerships.upsert({
    where: { id: 'dealer-sample-001' },
    update: {},
    create: {
      id: 'dealer-sample-001',
      name: 'Downtown Ford',
      agencyId: sampleAgency.id,
      address: '123 Main St, Austin, TX 78701',
      phone: '(512) 555-0123',
      website: 'https://downtownford.com',
      settings: {
        branding: {
          primaryColor: '#003f7f',
          logoUrl: null
        },
        seo: {
          targetRadius: 25,
          primaryKeywords: ['Ford dealer Austin', 'new Ford Austin', 'used cars Austin']
        }
  },
  updatedAt: new Date()
    }
  })

  const dealership2 = await prisma.dealerships.upsert({
    where: { id: 'dealer-sample-002' },
    update: {},
    create: {
      id: 'dealer-sample-002',
      name: 'Westside Toyota',
      agencyId: sampleAgency.id,
      address: '456 Oak Ave, Austin, TX 78704',
      phone: '(512) 555-0456',
      website: 'https://westsidetoyota.com',
      settings: {
        branding: {
          primaryColor: '#eb0a1e',
          logoUrl: null
        },
        seo: {
          targetRadius: 30,
          primaryKeywords: ['Toyota dealer Austin', 'new Toyota Austin', 'Prius Austin']
        }
  },
  updatedAt: new Date()
    }
  })
  console.log('✅ Sample dealerships created:', dealership1.name, dealership2.name)

  // Create agency admin user
  const agencyAdmin = await prisma.users.upsert({
    where: { email: 'admin@sample-auto.com' },
    update: {
      updatedAt: new Date()
    },
    create: {
      id: 'user-agency-admin-001',
      email: 'admin@sample-auto.com',
      name: 'Agency Admin',
      role: 'AGENCY_ADMIN',
      agencyId: sampleAgency.id,
      updatedAt: new Date()
    }
  })
  console.log('✅ Agency admin created:', agencyAdmin.email)

  // Create dealership admin users
  const dealershipAdmin1 = await prisma.users.upsert({
    where: { email: 'manager@downtownford.com' },
    update: {
      updatedAt: new Date()
    },
    create: {
      id: 'user-dealership-admin-001',
      email: 'manager@downtownford.com',
      name: 'Ford Manager',
      role: 'DEALERSHIP_ADMIN',
      agencyId: sampleAgency.id,
      dealershipId: dealership1.id,
      updatedAt: new Date()
    }
  })

  const dealershipAdmin2 = await prisma.users.upsert({
    where: { email: 'manager@westsidetoyota.com' },
    update: {
      updatedAt: new Date()
    },
    create: {
      id: 'user-dealership-admin-002',
      email: 'manager@westsidetoyota.com',
      name: 'Toyota Manager',
      role: 'DEALERSHIP_ADMIN',
      agencyId: sampleAgency.id,
      dealershipId: dealership2.id,
      updatedAt: new Date()
    }
  })
  console.log('✅ Dealership admins created:', dealershipAdmin1.email, dealershipAdmin2.email)

  // Create user preferences for all users
  for (const user of [superAdmin, agencyAdmin, dealershipAdmin1, dealershipAdmin2]) {
    await prisma.user_preferences.upsert({
      where: { userId: user.id },
      update: {},
      create: {
    id: crypto.randomUUID(),
    userId: user.id,
        emailNotifications: true,
        requestCreated: true,
        statusChanged: true,
        taskCompleted: true,
        weeklySummary: true,
        marketingEmails: false,
        timezone: 'America/Chicago',
  language: 'en',
  updatedAt: new Date()
      }
    })
  }
  console.log('✅ User preferences created for all users')

  // Create initial system settings
  await prisma.system_settings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
  id: 'default',
      maintenanceMode: false,
      newUserRegistration: true,
      emailNotifications: true,
      auditLogging: true,
      maxUsersPerAgency: 50,
      maxRequestsPerUser: 1000,
      maxFileUploadSize: 10,
      smtpHost: '',
      smtpPort: 587,
      smtpUser: '',
      smtpFromEmail: '',
      maintenanceMessage: 'The system is currently under maintenance.Please try again later.',
      welcomeMessage: 'Welcome to our SEO management platform! Get started by exploring your dashboard.',
      rateLimitPerMinute: 60,
  sessionTimeoutMinutes: 480,
  updatedAt: new Date()
    }
  })
  console.log('✅ System settings initialized')

  // Upsert SEOWORKS agency
  const seoworksAgency = await prisma.agencies.upsert({
    where: { id: 'agency-seoworks' },
    update: { updatedAt: new Date() },
    create: {
      id: 'agency-seoworks',
      name: 'SEOWORKS',
      slug: 'seoworks',
  updatedAt: new Date()
    }
  });
  console.log('✅ SEOWORKS agency created:', seoworksAgency.name);

  // Upsert dealerships under SEOWORKS agency
  const seoworksDealerships = [
    { id: 'dealer-jhc-columbus', name: 'Jay Hatfield Chevrolet of Columbus', website: 'https://www.jayhatfieldchevy.net/' },
    { id: 'dealer-jhc-chanute', name: 'Jay Hatfield Chevrolet GMC of Chanute', website: 'https://www.jayhatfieldchanute.com/' },
    { id: 'dealer-jhc-pittsburg', name: 'Jay Hatfield Chevrolet GMC of Pittsburg', website: 'https://www.jayhatfieldchevroletgmc.com/' },
    { id: 'dealer-jhc-vinita', name: 'Jay Hatfield Chevrolet of Vinita', website: 'https://www.jayhatfieldchevroletvinita.com/' },
    { id: 'dealer-jhdjr-frontenac', name: 'Jay Hatfield CDJR of Frontenac', website: 'https://www.jayhatfieldchryslerdodgejeepram.com/' },
    { id: 'dealer-sarcoxie-ford', name: 'Sarcoxie Ford', website: 'https://www.sarcoxieford.com' },
    { id: 'dealer-jhhp-wichita', name: 'Jay Hatfield Honda Powerhouse', website: 'https://www.jayhatfieldhondawichita.com/' },
    { id: 'dealer-jhm-wichita', name: 'Jay Hatfield Motorsports of Wichita', website: 'https://www.kansasmotorsports.com/' },
    { id: 'dealer-jhm-frontenac', name: 'Jay Hatfield Motorsports of Frontenac', website: 'https://www.jayhatfieldkawasaki.com/' },
    { id: 'dealer-jhm-joplin', name: 'Jay Hatfield Motorsports of Joplin', website: 'https://www.jhmofjoplin.com/' },
    { id: 'dealer-acura-columbus', name: 'Acura of Columbus', website: 'https://www.acuracolumbus.com/' },
    { id: 'dealer-genesis-wichita', name: 'Genesis of Wichita', website: 'https://www.genesisofwichita.com/' },
    { id: 'dealer-jhm-portal', name: 'Jay Hatfield Motorsports Portal', website: 'http://jayhatfieldmotorsports.com/' },
    { id: 'dealer-jhm-ottawa', name: 'Jay Hatfield Motorsports Ottawa', website: 'https://www.jayhatfieldottawa.com/' },
    { id: 'dealer-hatchett-hyundai-east', name: 'Hatchett Hyundai East', website: 'https://www.hatchetthyundaieast.com/' },
    { id: 'dealer-hatchett-hyundai-west', name: 'Hatchett Hyundai West', website: 'https://www.hatchetthyundaiwest.com/' },
    { id: 'dealer-premier-mitsubishi', name: 'Premier Mitsubishi', website: 'https://premiermitsubishi.com/' },
    { id: 'dealer-premier-auto-tucson', name: 'Premier Auto Center - Tucson', website: 'https://scottsaysyes.com/' },
    { id: 'dealer-world-kia', name: 'World Kia', website: 'https://www.worldkiajoliet.com/' },
    { id: 'dealer-aeo-powersports', name: 'AEO Powersports', website: 'https://aeopowersports.com/' },
    { id: 'dealer-columbus-auto-group', name: 'Columbus Auto Group', website: 'https://columbusautogroup.com/' },
    { id: 'dealer-winnebago-rockford', name: 'Winnebago of Rockford', website: 'https://www.winnebagomotorhomes.com/' }
  ];

  for (const d of seoworksDealerships) {
    const dealer = await prisma.dealerships.upsert({
      where: { id: d.id },
      update: {},
      create: {
        id: d.id,
        name: d.name,
        agencyId: seoworksAgency.id,
        website: d.website
  ,
  updatedAt: new Date()
      }
    });
    console.log('✅ Dealership created:', dealer.name);
  }
  console.log('✅ All SEOWORKS dealerships seeded.');

  console.log('🎉 Database seed completed successfully!')
  console.log(`\n📧 Super Admin Login: josh.copp@onekeel.ai`)
  console.log(`🏢 Sample Agency: ${sampleAgency.name}`)
  console.log(`🚗 Sample Dealerships: ${dealership1.name}, ${dealership2.name}`)
  console.log(`\n🔑 Test Accounts:`)
  console.log(`   • Agency Admin: admin@sample-auto.com`)
  console.log(`   • Ford Manager: manager@downtownford.com`)
  console.log(`   • Toyota Manager: manager@westsidetoyota.com`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
 .finally(async () => {
    await prisma.$disconnect()
  })
