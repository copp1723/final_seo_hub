#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixUserSession() {
  try {
    console.log('🔍 Finding existing user...')
    
    const existingUser = await prisma.users.findFirst({
      where: {
        email: 'josh.copp@onekeel.ai'
      },
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
    
    console.log('👤 Existing user:', existingUser)
    
    if (existingUser) {
      console.log('✅ User found with ID:', existingUser.id)
      console.log('🔧 You need to update your session to use this user ID')
      console.log('Or create a new session with the correct user ID')
      
      // Update the user to ensure they have proper dealership access
      const updatedUser = await prisma.users.update({
        where: { id: existingUser.id },
        data: {
          role: 'SUPER_ADMIN',
          agencyId: 'agency-seoworks',
          dealershipId: 'dealer-acura-columbus',
          currentDealershipId: 'dealer-acura-columbus'
        }
      })
      
      console.log('✅ Updated user permissions:', updatedUser)
      
    } else {
      console.log('❌ No user found with that email')
      
      // Create the user with the expected ID
      const targetUserId = 'f0f77fa5-e611-47f0-807a-134b54b99bad'
      
      const newUser = await prisma.users.create({
        data: {
          id: targetUserId,
          email: 'josh.copp@onekeel.ai',
          name: 'Josh Copp',
          role: 'SUPER_ADMIN',
          agencyId: 'agency-seoworks',
          dealershipId: 'dealer-acura-columbus',
          currentDealershipId: 'dealer-acura-columbus',
          updatedAt: new Date()
        }
      })
      
      console.log('✅ Created new user:', newUser)
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixUserSession()
