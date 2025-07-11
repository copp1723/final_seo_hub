#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkSeowerks() {
  try {
    console.log('🔍 Looking for SEOWERKS agency and admin...')
    
    // Find the SEOWERKS agency admin
    const agencyAdmin = await prisma.user.findFirst({
      where: { email: 'access@seowerks.ai' },
      include: {
        agency: {
          include: {
            dealerships: true
          }
        },
        dealership: true
      }
    })
    
    if (!agencyAdmin) {
      console.log('❌ Agency admin not found!')
      return
    }
    
    console.log('✅ Found agency admin:')
    console.log(`   - Name: ${agencyAdmin.name || 'Not set'}`)
    console.log(`   - Email: ${agencyAdmin.email}`)
    console.log(`   - Role: ${agencyAdmin.role}`)
    console.log(`   - Agency: ${agencyAdmin.agency?.name || 'Not assigned'}`)
    console.log(`   - Current Dealership: ${agencyAdmin.dealership?.name || 'None assigned'}`)
    
    if (!agencyAdmin.agency) {
      console.log('❌ User is not associated with an agency!')
      return
    }
    
    console.log(`\n📊 Agency "${agencyAdmin.agency.name}" has ${agencyAdmin.agency.dealerships.length} dealerships:`)
    
    if (agencyAdmin.agency.dealerships.length === 0) {
      console.log('   ❌ No dealerships found for this agency')
      console.log('\n💡 To create dealerships for this agency:')
      console.log('   1. As super admin, go to the admin dashboard')
      console.log('   2. Create dealerships for the SEOWERKS agency')
      console.log('   3. Or use the bulk create dealerships script')
      console.log(`   Agency ID: ${agencyAdmin.agency.id}`)
    } else {
      agencyAdmin.agency.dealerships.forEach((d, index) => {
        console.log(`   ${index + 1}. ${d.name} (ID: ${d.id})`)
      })
      
      if (!agencyAdmin.dealershipId) {
        console.log('\n⚠️  Agency admin has no dealership assigned!')
        console.log('This is why integrations cannot be connected.')
        
        // Optionally assign the first dealership
        const firstDealership = agencyAdmin.agency.dealerships[0]
        console.log(`\n💡 To fix this, run the following command to assign "${firstDealership.name}" to the agency admin:`)
        console.log(`\n   node scripts/assign-dealership.js ${agencyAdmin.id} ${firstDealership.id}`)
        
        // Or uncomment this to automatically assign:
        /*
        console.log(`\n🔧 Automatically assigning "${firstDealership.name}" to agency admin...`)
        await prisma.user.update({
          where: { id: agencyAdmin.id },
          data: { dealershipId: firstDealership.id }
        })
        console.log('✅ Dealership assigned successfully!')
        */
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkSeowerks() 