const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')

const prisma = new PrismaClient()

async function generateInvitationToken() {
  try {
    const email = 'access@seowerks.ai'
    
    console.log(`🔍 Generating invitation token for ${email}...`)
    
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email }
    })
    
    if (!user) {
      console.log(`❌ User ${email} not found`)
      return
    }
    
    console.log(`✅ Found user: ${user.email} (${user.role})`)
    
    // Generate secure token
    const invitationToken = crypto.randomBytes(32).toString('hex')
    const invitationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    
    // Update user with invitation token
    await prisma.user.update({
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
    console.log('\n✅ The user can now click this URL to sign in directly!')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

generateInvitationToken()