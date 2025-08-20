#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function createSeowerksTestDealership() {
  try {
    console.log('🔍 Finding SEOWERKS agency and admin...')
    
    // Find the SEOWERKS agency admin
    const agencyAdmin = await prisma.user.findFirst({
      where: { email: 'access@seowerks.ai' },
      include: {
        agency: true
      }
    })
    
    if (!agencyAdmin) {
      console.log('❌ SEOWERKS agency admin not found!')
      return
    }
    
    if (!agencyAdmin.agency) {
      console.log('❌ User is not associated with an agency!')
      return
    }
    
    console.log('✅ Found SEOWERKS agency:', agencyAdmin.agency.name)
    console.log('✅ Found agency admin:', agencyAdmin.email)
    
    // Create a test dealership
    console.log('\n🏢 Creating test dealership for SEOWERKS...')
    
    const dealership = await prisma.dealership.create({
      data: {
        name: 'SEOWERKS Test Dealership',
        website: 'https://test.seowerks.ai',
        address: '123 Test Street',
        phone: '(555) 123-4567',
        agencyId: agencyAdmin.agency.id,
        activePackageType: 'GOLD',
        settings: {
          branding: {
            primaryColor: '#1f2937'
          }
        }
      }
    })
    
    console.log('✅ Created dealership:', dealership.name)
    console.log('   ID:', dealership.id)
    
    // Assign the dealership to the agency admin
    console.log('\n🔧 Assigning dealership to agency admin...')
    
    await prisma.user.update({
      where: { id: agencyAdmin.id },
      data: { dealershipId: dealership.id }
    })
    
    console.log('✅ Success! Agency admin now has a dealership assigned.')
    console.log('\n📋 Summary:')
    console.log('   Agency: SEOWERKS')
    console.log('   Admin: access@seowerks.ai')
    console.log('   Dealership: SEOWERKS Test Dealership')
    console.log('\n🎯 Next steps:')
    console.log('   1. Impersonate the agency admin')
    console.log('   2. Go to Settings > Integrations')
    console.log('   3. Connect GA4 and Search Console')
    console.log('   4. Start managing SEO tasks!')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createSeowerksTestDealership() 