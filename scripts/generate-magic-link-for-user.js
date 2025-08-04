#!/usr/bin/env node
/**
 * Generate magic link for existing users
 * Usage: node scripts/generate-magic-link-for-user.js
 */

const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')
const readline = require('readline')

const prisma = new PrismaClient()

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

async function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve)
  })
}

async function generateMagicLink() {
  try {
    // Get user email
    const email = await question('Enter user email: ')
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        agencyId: true,
        onboardingCompleted: true,
        invitationToken: true,
        invitationTokenExpires: true
      }
    })
    
    if (!user) {
      console.error('❌ User not found with email:', email)
      process.exit(1)
    }
    
    console.log('\n✅ User found:')
    console.log('  ID:', user.id)
    console.log('  Name:', user.name)
    console.log('  Role:', user.role)
    console.log('  Agency ID:', user.agencyId || 'None')
    console.log('  Onboarding:', user.onboardingCompleted ? 'Completed' : 'Not completed')
    
    // Check if token already exists
    if (user.invitationToken && user.invitationTokenExpires > new Date()) {
      console.log('\n⚠️  User already has a valid invitation token!')
      const useExisting = await question('Use existing token? (y/n): ')
      
      if (useExisting.toLowerCase() === 'y') {
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
        const magicLinkUrl = `${baseUrl}/api/invitation?token=${user.invitationToken}`
        console.log('\n🔗 Existing magic link:')
        console.log(magicLinkUrl)
        console.log('\n⏰ Expires at:', user.invitationTokenExpires.toLocaleString())
        process.exit(0)
      }
    }
    
    // Generate new token
    const confirm = await question('\nGenerate new magic link? (y/n): ')
    if (confirm.toLowerCase() !== 'y') {
      console.log('❌ Cancelled')
      process.exit(0)
    }
    
    const invitationToken = crypto.randomBytes(32).toString('hex')
    const invitationTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    
    // Update user with new token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        invitationToken,
        invitationTokenExpires
      }
    })
    
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const magicLinkUrl = `${baseUrl}/api/invitation?token=${invitationToken}`
    
    console.log('\n✅ Magic link generated successfully!')
    console.log('\n🔗 Magic link URL:')
    console.log(magicLinkUrl)
    console.log('\n⏰ Expires at:', invitationTokenExpires.toLocaleString())
    console.log('\n📧 Send this link to the user to allow them to sign in')
    
    // Show where they'll be redirected
    if (user.role === 'USER' && user.agencyId && !user.onboardingCompleted) {
      console.log('\n➡️  User will be redirected to: Onboarding page')
    } else {
      console.log('\n➡️  User will be redirected to: Dashboard')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    rl.close()
    await prisma.$disconnect()
  }
}

generateMagicLink()