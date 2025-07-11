#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function assignDealership(userId, dealershipId) {
  try {
    if (!userId || !dealershipId) {
      console.log('Usage: node scripts/assign-dealership.js <userId> <dealershipId>')
      process.exit(1)
    }
    
    console.log('🔍 Finding user and dealership...')
    
    // Find the user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        agency: true,
        dealership: true
      }
    })
    
    if (!user) {
      console.log('❌ User not found!')
      return
    }
    
    // Find the dealership
    const dealership = await prisma.dealership.findUnique({
      where: { id: dealershipId },
      include: { agency: true }
    })
    
    if (!dealership) {
      console.log('❌ Dealership not found!')
      return
    }
    
    console.log('📋 Current state:')
    console.log(`   User: ${user.name || user.email} (${user.role})`)
    console.log(`   Current dealership: ${user.dealership?.name || 'None'}`)
    console.log(`   Target dealership: ${dealership.name}`)
    console.log(`   Dealership agency: ${dealership.agency.name}`)
    
    // Check if user has access to this dealership
    if (user.agencyId !== dealership.agencyId && user.role !== 'SUPER_ADMIN') {
      console.log('❌ User does not have access to this dealership (different agency)!')
      return
    }
    
    console.log('\n🔧 Assigning dealership to user...')
    
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { dealershipId: dealershipId }
    })
    
    console.log('✅ Success! Dealership assigned.')
    console.log(`   ${updatedUser.name || updatedUser.email} is now assigned to ${dealership.name}`)
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Get command line arguments
const userId = process.argv[2]
const dealershipId = process.argv[3]

assignDealership(userId, dealershipId) 