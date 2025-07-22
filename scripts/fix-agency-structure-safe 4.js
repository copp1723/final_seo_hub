const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixAgencyStructureSafe() {
  console.log('🏢 FIXING AGENCY STRUCTURE - CONSOLIDATING TO SEOWORKS (SAFE)')
  console.log('=' .repeat(70))
  
  try {
    // Step 1: Check current agencies
    console.log('\n📊 STEP 1: CHECKING CURRENT AGENCIES')
    console.log('─'.repeat(50))
    
    const currentAgencies = await prisma.agencies.findMany({
      include: {
        _count: {
          select: {
            users: true,
            dealerships: true,
            user_invites: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })
    
    console.log(`Found ${currentAgencies.length} agencies:`)
    currentAgencies.forEach(agency => {
      console.log(`   - ${agency.name} (${agency.slug})`)
      console.log(`     Users: ${agency._count.users}, Dealerships: ${agency._count.dealerships}, Invites: ${agency._count.user_invites}`)
    })
    
    // Step 2: Find or create SEO Werks agency
    console.log('\n🏢 STEP 2: FINDING SEOWORKS AGENCY')
    console.log('─'.repeat(50))
    
    let seowerksAgency = await prisma.agencies.findFirst({
      where: {
        OR: [
          { name: { contains: 'SEO', mode: 'insensitive' } },
          { name: { contains: 'SEOWORKS', mode: 'insensitive' } },
          { slug: 'seoworks' }
        ]
      }
    })
    
    if (!seowerksAgency) {
      seowerksAgency = await prisma.agencies.create({
        data: {
          id: 'seoworks-agency',
          name: 'SEO Werks',
          slug: 'seoworks',
          domain: 'seoworks.com',
          primaryColor: '#0066cc',
          secondaryColor: '#004499',
          plan: 'platinum',
          status: 'active',
          maxUsers: 100,
          maxConversations: 10000,
          updatedAt: new Date()
        }
      })
      console.log('✅ Created SEO Werks agency')
    } else {
      console.log('✅ Found existing SEO Werks agency')
    }
    
    console.log(`   ID: ${seowerksAgency.id}`)
    console.log(`   Name: ${seowerksAgency.name}`)
    console.log(`   Slug: ${seowerksAgency.slug}`)
    
    // Step 3: Move all dealerships to SEO Werks
    console.log('\n🚗 STEP 3: MOVING ALL DEALERSHIPS TO SEOWORKS')
    console.log('─'.repeat(50))
    
    const allDealerships = await prisma.dealerships.findMany()
    console.log(`Found ${allDealerships.length} dealerships to move`)
    
    let movedCount = 0
    for (const dealership of allDealerships) {
      if (dealership.agencyId !== seowerksAgency.id) {
        await prisma.dealerships.update({
          where: { id: dealership.id },
          data: { agencyId: seowerksAgency.id }
        })
        movedCount++
        console.log(`   ✅ Moved: ${dealership.name}`)
      }
    }
    
    console.log(`\n📊 Moved ${movedCount} dealerships to SEO Werks`)
    
    // Step 4: Move all users to SEO Werks (except super admin)
    console.log('\n👥 STEP 4: MOVING USERS TO SEOWORKS')
    console.log('─'.repeat(50))
    
    const allUsers = await prisma.users.findMany({
      where: {
        role: { not: 'SUPER_ADMIN' }
      }
    })
    
    console.log(`Found ${allUsers.length} non-super-admin users to move`)
    
    let userMovedCount = 0
    for (const user of allUsers) {
      if (user.agencyId !== seowerksAgency.id) {
        await prisma.users.update({
          where: { id: user.id },
          data: { agencyId: seowerksAgency.id }
        })
        userMovedCount++
        console.log(`   ✅ Moved: ${user.email} (${user.role})`)
      }
    }
    
    console.log(`\n📊 Moved ${userMovedCount} users to SEO Werks`)
    
    // Step 5: Handle user invites before deleting agencies
    console.log('\n📧 STEP 5: HANDLING USER INVITES')
    console.log('─'.repeat(50))
    
    const agenciesToDelete = await prisma.agencies.findMany({
      where: {
        id: { not: seowerksAgency.id }
      },
      include: {
        user_invites: true
      }
    })
    
    for (const agency of agenciesToDelete) {
      if (agency.user_invites.length > 0) {
        console.log(`   📧 Moving ${agency.user_invites.length} invites from ${agency.name}`)
        
        // Update all user invites to point to SEO Werks agency
        await prisma.user_invites.updateMany({
          where: { invitedBy: agency.id },
          data: { invitedBy: seowerksAgency.id }
        })
      }
    }
    
    // Step 6: Now safely delete other agencies
    console.log('\n🗑️  STEP 6: REMOVING OTHER AGENCIES')
    console.log('─'.repeat(50))
    
    console.log(`Found ${agenciesToDelete.length} agencies to delete`)
    
    for (const agency of agenciesToDelete) {
      console.log(`   🗑️  Deleting: ${agency.name} (${agency.slug})`)
      try {
        await prisma.agencies.delete({
          where: { id: agency.id }
        })
        console.log(`   ✅ Deleted: ${agency.name}`)
      } catch (error) {
        console.log(`   ⚠️  Could not delete ${agency.name}: ${error.message}`)
      }
    }
    
    // Step 7: Fix GA4 connection to work with current dealership
    console.log('\n🔧 STEP 7: FIXING GA4 CONNECTION')
    console.log('─'.repeat(50))
    
    const ga4Connection = await prisma.ga4_connections.findFirst({
      where: { propertyId: '320759942' }
    })
    
    if (ga4Connection) {
      // Get the user
      const user = await prisma.users.findUnique({
        where: { email: 'josh.copp@onekeel.ai' }
      })
      
      if (user) {
        // Update GA4 connection to link to user's current dealership
        await prisma.ga4_connections.update({
          where: { id: ga4Connection.id },
          data: { dealershipId: user.dealershipId }
        })
        
        console.log(`✅ Updated GA4 connection to link to user's dealership: ${user.dealershipId}`)
      }
    }
    
    // Step 8: Verify final structure
    console.log('\n✅ STEP 8: VERIFICATION')
    console.log('─'.repeat(50))
    
    const finalAgency = await prisma.agencies.findUnique({
      where: { id: seowerksAgency.id },
      include: {
        _count: {
          select: {
            users: true,
            dealerships: true
          }
        }
      }
    })
    
    console.log('🎯 FINAL STRUCTURE:')
    console.log(`   Agency: ${finalAgency.name}`)
    console.log(`   Users: ${finalAgency._count.users}`)
    console.log(`   Dealerships: ${finalAgency._count.dealerships}`)
    
    const dealerships = await prisma.dealerships.findMany({
      where: { agencyId: seowerksAgency.id },
      orderBy: { name: 'asc' }
    })
    
    console.log('\n🏢 Dealerships under SEO Werks:')
    dealerships.forEach(dealer => {
      console.log(`   - ${dealer.name} (${dealer.id})`)
    })
    
    console.log('\n🎯 FIX COMPLETE!')
    console.log('1. All agencies consolidated into "SEO Werks"')
    console.log('2. All dealerships moved to SEO Werks')
    console.log('3. All users moved to SEO Werks')
    console.log('4. GA4 connection aligned with user dealership')
    console.log('5. Refresh your browser to see changes')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixAgencyStructureSafe() 