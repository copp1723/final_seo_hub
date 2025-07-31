// Simplified token generation script for Render environment
// Environment variables are already loaded in Render

const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')

const prisma = new PrismaClient()

async function generateInvitationToken() {
  try {
    const email = process.argv[2] || 'access@seowerks.ai'
    
    console.log(`🔍 Generating invitation token for ${email}...`)
    console.log('Database URL:', process.env.DATABASE_URL ? 'Set ✓' : 'Not set ✗')
    console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL || 'Not set')
    
    // Find the user
    const user = await prisma.users.findUnique({
      where: { email }
    })
    
    if (!user) {
      console.log(`❌ User ${email} not found`)
      
      // List available users for debugging
      console.log('\n📋 Available users:')
      const users = await prisma.users.findMany({
        select: { email: true, role: true }
      })
      users.forEach(u => console.log(`  - ${u.email} (${u.role})`))
      return
    }
    
    console.log(`✅ Found user: ${user.email} (${user.role})`)
    
    // Generate secure token
    const invitationToken = crypto.randomBytes(32).toString('hex')
    const invitationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    
    // Update user with invitation token
    await prisma.users.update({
      where: { id: user.id },
      data: {
        invitationToken,
        invitationTokenExpires
      }
    })
    
    // Generate invitation URL - IMPORTANT: Use /api/invitation not /api/auth/invitation
    const baseUrl = process.env.NEXTAUTH_URL || 'https://rylie-seo-hub.onrender.com'
    const invitationUrl = `${baseUrl}/api/invitation?token=${invitationToken}`
    
    console.log('\n🎯 INVITATION TOKEN GENERATED!')
    console.log('📧 Email:', email)
    console.log('🔗 Invitation URL:', invitationUrl)
    console.log('⏰ Expires:', invitationTokenExpires.toISOString())
    console.log('\n✅ Copy and paste this URL in an incognito browser to test!')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    if (error.stack) {
      console.error('Stack:', error.stack)
    }
  } finally {
    await prisma.$disconnect()
  }
}

// Run immediately
generateInvitationToken() 