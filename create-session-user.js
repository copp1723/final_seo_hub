#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function createSessionUser() {
  try {
    console.log('🔍 Creating user for current session...')
    
    const targetUserId = 'f0f77fa5-e611-47f0-807a-134b54b99bad'
    
    // Check if user already exists
    const existingUser = await prisma.users.findUnique({
      where: { id: targetUserId }
    })
    
    if (existingUser) {
      console.log('✅ User already exists:', existingUser.email)
      return
    }
    
    // Create the user with the expected ID
    const newUser = await prisma.users.create({
      data: {
        id: targetUserId,
        email: 'josh.copp+session@onekeel.ai',
        name: 'Josh Copp (Session)',
        role: 'SUPER_ADMIN',
        agencyId: 'agency-seoworks',
        dealershipId: 'dealer-acura-columbus',
        currentDealershipId: 'dealer-acura-columbus',
        emailVerified: new Date(),
        onboardingCompleted: true,
        isSuperAdmin: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
    
    console.log('✅ Created session user:', {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      dealershipId: newUser.dealershipId,
      agencyId: newUser.agencyId
    })
    
    // Verify the user can access the dealership
    const dealership = await prisma.dealerships.findUnique({
      where: { id: 'dealer-acura-columbus' },
      select: {
        id: true,
        name: true,
        agencyId: true
      }
    })
    
    console.log('🏢 Target dealership:', dealership)
    
    if (newUser.agencyId === dealership.agencyId || newUser.role === 'SUPER_ADMIN') {
      console.log('✅ User has access to dealership')
    } else {
      console.log('❌ User does not have access to dealership')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createSessionUser()
