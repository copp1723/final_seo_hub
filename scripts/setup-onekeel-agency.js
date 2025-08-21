const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')

const prisma = new PrismaClient()

async function setupOneKeelAgency() {
  try {
    console.log('🚀 Setting up OneKeel.ai agency...')
    
    // Step 1: Create or find the OneKeel.ai agency
    console.log('\n📋 Step 1: Creating OneKeel.ai agency...')
    
    let agency = await prisma.agencies.findFirst({
      where: { name: 'OneKeel.ai' }
    })
    
    if (agency) {
      console.log('✅ OneKeel.ai agency already exists:', agency.id)
    } else {
      agency = await prisma.agencies.create({
        data: {
          id: crypto.randomUUID(),
          name: 'OneKeel.ai',
          slug: 'onekeel-ai',
          domain: 'onekeel.ai',
          primaryColor: '#3b82f6',
          secondaryColor: '#1e40af',
          plan: 'enterprise',
          status: 'active',
          maxUsers: 50,
          maxConversations: 1000,
          updatedAt: new Date()
        }
      })
      console.log('✅ Created OneKeel.ai agency:', agency.id)
    }
    
    // Step 2: Create agency admin user
    console.log('\n👤 Step 2: Creating agency admin user...')
    
    const adminEmail = 'seo-access@onekeel.ai'
    let adminUser = await prisma.users.findUnique({
      where: { email: adminEmail }
    })
    
    if (adminUser) {
      console.log('✅ Agency admin user already exists:', adminEmail)
      // Update to ensure they're assigned to the agency
      adminUser = await prisma.users.update({
        where: { id: adminUser.id },
        data: {
          agencyId: agency.id,
          role: 'AGENCY_ADMIN'
        }
      })
    } else {
      adminUser = await prisma.users.create({
        data: {
          id: crypto.randomUUID(),
          email: adminEmail,
          name: 'OneKeel Agency Admin',
          role: 'AGENCY_ADMIN',
          agencyId: agency.id,
          onboardingCompleted: true
        }
      })
      console.log('✅ Created agency admin user:', adminEmail)
    }
    
    // Step 3: Create dealerships
    console.log('\n🏢 Step 3: Creating dealerships...')
    
    const dealershipsData = [
      {
        name: 'City CDJR of Brookfield',
        website: 'https://www.citycdjrofbrookfield.com',
        address: 'Brookfield, WI',
        phone: null
      },
      {
        name: 'City Chevrolet of Grayslake',
        website: 'https://www.citychevroletofgrayslake.com',
        address: 'Grayslake, IL',
        phone: null
      }
    ]
    
    const createdDealerships = []
    
    for (const dealershipData of dealershipsData) {
      let dealership = await prisma.dealerships.findFirst({
        where: { 
          name: dealershipData.name,
          agencyId: agency.id
        }
      })
      
      if (dealership) {
        console.log(`✅ Dealership already exists: ${dealershipData.name}`)
        createdDealerships.push(dealership)
      } else {
        dealership = await prisma.dealerships.create({
          data: {
            name: dealershipData.name,
            agencyId: agency.id,
            website: dealershipData.website,
            address: dealershipData.address,
            phone: dealershipData.phone,
            activePackageType: 'GOLD', // Default package
            currentBillingPeriodStart: new Date(),
            currentBillingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            settings: {
              emailNotifications: true,
              autoApprove: false,
              defaultPackage: 'GOLD'
            }
          }
        })
        console.log(`✅ Created dealership: ${dealershipData.name} (ID: ${dealership.id})`)
        createdDealerships.push(dealership)
      }
    }
    
    // Step 4: Generate invitation token for agency admin
    console.log('\n🎫 Step 4: Generating invitation token...')
    
    const invitationToken = crypto.randomBytes(32).toString('hex')
    const invitationTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    
    await prisma.users.update({
      where: { id: adminUser.id },
      data: {
        invitationToken,
        invitationTokenExpires
      }
    })
    
    const baseUrl = process.env.NEXTAUTH_URL || 'https://rylie-seo-hub.onrender.com'
    const invitationUrl = `${baseUrl}/api/invitation?token=${invitationToken}`
    
    // Step 5: Create user preferences
    console.log('\n⚙️ Step 5: Setting up user preferences...')
    
    const existingPrefs = await prisma.user_preferences.findUnique({
      where: { userId: adminUser.id }
    })
    
    if (!existingPrefs) {
      await prisma.user_preferences.create({
        data: {
          userId: adminUser.id,
          emailNotifications: true,
          requestCreated: true,
          statusChanged: true,
          taskCompleted: true,
          weeklySummary: true,
          marketingEmails: false,
          timezone: 'America/Chicago',
          language: 'en'
        }
      })
      console.log('✅ Created user preferences for agency admin')
    } else {
      console.log('✅ User preferences already exist')
    }
    
    // Summary
    console.log('\n🎉 SETUP COMPLETE!')
    console.log('=' * 50)
    console.log(`📊 Agency: OneKeel.ai (ID: ${agency.id})`)
    console.log(`👤 Admin User: ${adminEmail} (ID: ${adminUser.id})`)
    console.log(`🏢 Dealerships Created: ${createdDealerships.length}`)
    createdDealerships.forEach((d, i) => {
      console.log(`   ${i + 1}. ${d.name} (ID: ${d.id})`)
    })
    console.log(`\n🔗 Invitation URL: ${invitationUrl}`)
    console.log(`⏰ Expires: ${invitationTokenExpires.toISOString()}`)
    console.log('\n📧 Send this invitation URL to seo-access@onekeel.ai to get started!')
    
    return {
      agency,
      adminUser,
      dealerships: createdDealerships,
      invitationUrl
    }
    
  } catch (error) {
    console.error('❌ Error during setup:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the setup
if (require.main === module) {
  setupOneKeelAgency()
    .then(() => {
      console.log('✅ Setup completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Setup failed:', error)
      process.exit(1)
    })
}

module.exports = { setupOneKeelAgency }