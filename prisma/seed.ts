import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create or update super admin user (Josh)
  const superAdmin = await prisma.user.upsert({
    where: { email: 'josh.copp@onekeel.ai' },
    update: {
      role: 'SUPER_ADMIN',
      name: 'Josh Copp',
      onboardingCompleted: true,
    },
    create: {
      email: 'josh.copp@onekeel.ai',
      name: 'Josh Copp',
      role: 'SUPER_ADMIN',
      onboardingCompleted: true,
    },
  })
  console.log('✅ Super admin user created:', superAdmin.email)

  // Create sample agency for testing
  const sampleAgency = await prisma.agency.upsert({
    where: { id: 'agency-sample-001' },
    update: {},
    create: {
      id: 'agency-sample-001',
      name: 'Sample Auto Agency',
      domain: 'sample-auto.com',
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
    },
  })
  console.log('✅ Sample agency created:', sampleAgency.name)

  // Create sample dealerships under the agency
  const dealership1 = await prisma.dealership.upsert({
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
      }
    },
  })

  const dealership2 = await prisma.dealership.upsert({
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
      }
    },
  })
  console.log('✅ Sample dealerships created:', dealership1.name, dealership2.name)

  // Create agency admin user
  const agencyAdmin = await prisma.user.upsert({
    where: { email: 'admin@sample-auto.com' },
    update: {},
    create: {
      email: 'admin@sample-auto.com',
      name: 'Agency Admin',
      role: 'AGENCY_ADMIN',
      agencyId: sampleAgency.id,
      onboardingCompleted: true,
    },
  })
  console.log('✅ Agency admin created:', agencyAdmin.email)

  // Create dealership admin users
  const dealershipAdmin1 = await prisma.user.upsert({
    where: { email: 'manager@downtownford.com' },
    update: {},
    create: {
      email: 'manager@downtownford.com',
      name: 'Ford Manager',
      role: 'DEALERSHIP_ADMIN',
      agencyId: sampleAgency.id,
      dealershipId: dealership1.id,
      onboardingCompleted: true,
    },
  })

  const dealershipAdmin2 = await prisma.user.upsert({
    where: { email: 'manager@westsidetoyota.com' },
    update: {},
    create: {
      email: 'manager@westsidetoyota.com',
      name: 'Toyota Manager',
      role: 'DEALERSHIP_ADMIN',
      agencyId: sampleAgency.id,
      dealershipId: dealership2.id,
      onboardingCompleted: true,
    },
  })
  console.log('✅ Dealership admins created:', dealershipAdmin1.email, dealershipAdmin2.email)

  // Create user preferences for all users
  for (const user of [superAdmin, agencyAdmin, dealershipAdmin1, dealershipAdmin2]) {
    await prisma.userPreferences.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        emailNotifications: true,
        requestCreated: true,
        statusChanged: true,
        taskCompleted: true,
        weeklySummary: true,
        marketingEmails: false,
        timezone: 'America/Chicago',
        language: 'en',
      },
    })
  }
  console.log('✅ User preferences created for all users')

  // Create initial system settings
  await prisma.systemSettings.upsert({
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
      maintenanceMessage: 'The system is currently under maintenance. Please try again later.',
      welcomeMessage: 'Welcome to our SEO management platform! Get started by exploring your dashboard.',
      rateLimitPerMinute: 60,
      sessionTimeoutMinutes: 480,
    },
  })
  console.log('✅ System settings initialized')

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