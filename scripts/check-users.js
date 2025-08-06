#!/usr/bin/env node

/**
 * Check existing users in the database
 */

require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

const { PrismaClient } = require('@prisma/client')

async function checkUsers() {
  const prisma = new PrismaClient()
  
  try {
    console.log('👥 Checking existing users...\n')
    
    const users = await prisma.users.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isSuperAdmin: true,
        agencyId: true,
        dealershipId: true,
        onboardingCompleted: true,
        invitationToken: true,
        invitationTokenExpires: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    if (users.length === 0) {
      console.log('❌ No users found in the database')
      console.log('   You need to create a super admin user first')
      return
    }
    
    console.log(`📊 Found ${users.length} users:\n`)
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name || 'No Name'} (${user.email})`)
      console.log(`   Role: ${user.role}${user.isSuperAdmin ? ' (SUPER ADMIN)' : ''}`)
      console.log(`   Agency ID: ${user.agencyId || 'None'}`)
      console.log(`   Dealership ID: ${user.dealershipId || 'None'}`)
      console.log(`   Onboarding: ${user.onboardingCompleted ? '✅ Complete' : '❌ Incomplete'}`)
      console.log(`   Invitation Token: ${user.invitationToken ? '🔑 Active' : '❌ None'}`)
      if (user.invitationTokenExpires) {
        const isExpired = new Date(user.invitationTokenExpires) < new Date()
        console.log(`   Token Expires: ${user.invitationTokenExpires} ${isExpired ? '(EXPIRED)' : '(VALID)'}`)
      }
      console.log(`   Created: ${user.createdAt}`)
      console.log()
    })
    
    // Check for super admins
    const superAdmins = users.filter(u => u.role === 'SUPER_ADMIN' || u.isSuperAdmin)
    if (superAdmins.length === 0) {
      console.log('⚠️  No super admin users found!')
      console.log('   You need a super admin to send invitations')
      console.log('   Create one using the emergency admin script or database directly')
    } else {
      console.log(`✅ Found ${superAdmins.length} super admin(s):`)
      superAdmins.forEach(admin => {
        console.log(`   - ${admin.name || 'No Name'} (${admin.email})`)
      })
    }
    
  } catch (error) {
    console.error('❌ Error checking users:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkUsers().catch(console.error)
