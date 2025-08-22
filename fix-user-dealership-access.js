#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixUserDealershipAccess() {
  try {
    console.log('🔍 Checking user dealership access...')
    
    const userId = 'f0f77fa5-e611-47f0-807a-134b54b99bad'
    const dealershipId = 'dealer-acura-columbus'
    
    // Check current user
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        dealershipId: true,
        agencyId: true,
        currentDealershipId: true
      }
    })
    
    console.log('👤 Current user:', user)
    
    // Check dealership
    const dealership = await prisma.dealerships.findUnique({
      where: { id: dealershipId },
      select: {
        id: true,
        name: true,
        agencyId: true
      }
    })
    
    console.log('🏢 Target dealership:', dealership)
    
    if (!dealership) {
      console.log('❌ Dealership not found')
      return
    }
    
    // Check if user has access through agency
    if (user.role === 'SUPER_ADMIN') {
      console.log('✅ User is SUPER_ADMIN - should have access to all dealerships')
      
      // Update user's current dealership
      await prisma.users.update({
        where: { id: userId },
        data: {
          currentDealershipId: dealershipId,
          dealershipId: dealershipId // Also set primary dealership
        }
      })
      
      console.log('✅ Updated user dealership associations')
    } else if (user.agencyId === dealership.agencyId) {
      console.log('✅ User has access through agency')
      
      // Update user's current dealership
      await prisma.users.update({
        where: { id: userId },
        data: {
          currentDealershipId: dealershipId
        }
      })
      
      console.log('✅ Updated user current dealership')
    } else {
      console.log('❌ User does not have access to this dealership')
      console.log('User agency:', user.agencyId)
      console.log('Dealership agency:', dealership.agencyId)
    }
    
    // Check final state
    const updatedUser = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        dealershipId: true,
        agencyId: true,
        currentDealershipId: true
      }
    })
    
    console.log('👤 Updated user:', updatedUser)
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixUserDealershipAccess()
