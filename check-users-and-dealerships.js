#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkUsersAndDealerships() {
  try {
    console.log('🔍 Checking all users...')
    
    const users = await prisma.users.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        dealershipId: true,
        agencyId: true,
        currentDealershipId: true
      }
    })
    
    console.log('👥 All users:')
    users.forEach(user => {
      console.log(`  - ${user.email} (${user.role}) - Agency: ${user.agencyId}, Dealership: ${user.dealershipId}`)
    })
    
    console.log('\n🏢 Checking dealerships...')
    
    const dealerships = await prisma.dealerships.findMany({
      select: {
        id: true,
        name: true,
        agencyId: true
      },
      take: 10
    })
    
    console.log('🏢 Available dealerships:')
    dealerships.forEach(dealership => {
      console.log(`  - ${dealership.name} (${dealership.id}) - Agency: ${dealership.agencyId}`)
    })
    
    console.log('\n🏛️ Checking agencies...')
    
    const agencies = await prisma.agencies.findMany({
      select: {
        id: true,
        name: true
      }
    })
    
    console.log('🏛️ Available agencies:')
    agencies.forEach(agency => {
      console.log(`  - ${agency.name} (${agency.id})`)
    })
    
    // Check if we need to create a test user
    const targetUserId = 'f0f77fa5-e611-47f0-807a-134b54b99bad'
    const existingUser = users.find(u => u.id === targetUserId)
    
    if (!existingUser) {
      console.log('\n❌ Target user not found. Creating test user...')
      
      const newUser = await prisma.users.create({
        data: {
          id: targetUserId,
          email: 'josh.copp@onekeel.ai',
          name: 'Josh Copp',
          role: 'SUPER_ADMIN',
          agencyId: 'agency-seoworks',
          dealershipId: 'dealer-acura-columbus',
          currentDealershipId: 'dealer-acura-columbus'
        }
      })
      
      console.log('✅ Created user:', newUser)
    } else {
      console.log('\n✅ Target user exists:', existingUser)
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUsersAndDealerships()
