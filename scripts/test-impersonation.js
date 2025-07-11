#!/usr/bin/env node

// Simple script to test user impersonation
// Run with: node scripts/test-impersonation.js

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testImpersonation() {
  try {
    console.log('🔍 Finding SEOWERKS agency admin...')
    
    // Find the SEOWERKS agency admin
    const agencyAdmin = await prisma.user.findFirst({
      where: {
        email: 'access@seowerks.ai'
      },
      include: {
        agency: true,
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
    console.log(`   - User ID: ${agencyAdmin.id}`)
    
    console.log('\n📋 To test impersonation:')
    console.log('1. Log in as super admin')
    console.log('2. Look for the "Impersonate User" button in the navigation bar')
    console.log('3. Search for "access@seowerks.ai" or "seowerks"')
    console.log('4. Click "Impersonate" next to the user')
    console.log('5. You should be redirected to the dashboard as the agency admin')
    console.log('6. You\'ll see an orange indicator showing you\'re impersonating')
    console.log('7. Click "Stop Impersonation" to return to your super admin account')
    
    console.log('\n🎯 Quick Copy User ID:')
    console.log(agencyAdmin.id)
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testImpersonation() 