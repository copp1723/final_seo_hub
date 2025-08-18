const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')

const prisma = new PrismaClient()

async function regenerateInvitationToken() {
  try {
    console.log('🔄 Regenerating invitation token for OneKeel.ai admin...')
    
    const email = 'seo-access@onekeel.ai'
    
    // Find the user
    const user = await prisma.users.findUnique({
      where: { email }
    })
    
    if (!user) {
      console.log(`❌ User ${email} not found`)
      return
    }
    
    console.log(`✅ Found user: ${user.email} (${user.role})`)
    
    // Generate new secure token
    const invitationToken = crypto.randomBytes(32).toString('hex')
    const invitationTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    
    // Update user with new invitation token
    await prisma.users.update({
      where: { id: user.id },
      data: {
        invitationToken,
        invitationTokenExpires
      }
    })
    
    // Generate invitation URL with correct base URL
    const baseUrl = 'https://rylie-seo-hub.onrender.com'
    const invitationUrl = `${baseUrl}/api/invitation?token=${invitationToken}`
    
    console.log('\n🎯 NEW INVITATION TOKEN GENERATED!')
    console.log('=' * 50)
    console.log('📧 Email:', email)
    console.log('🆔 User ID:', user.id)
    console.log('🏢 Agency ID:', user.agencyId)
    console.log('👑 Role:', user.role)
    console.log('🔗 Invitation URL:', invitationUrl)
    console.log('⏰ Expires:', invitationTokenExpires.toISOString())
    console.log('🕐 Current Time:', new Date().toISOString())
    console.log('✅ Valid for:', Math.round((invitationTokenExpires - new Date()) / (1000 * 60 * 60)), 'hours')
    
    console.log('\n📋 INSTRUCTIONS:')
    console.log('1. Copy the invitation URL above')
    console.log('2. Open it in your browser')
    console.log('3. It should redirect you to the dashboard after login')
    console.log('4. You will be logged in as the OneKeel.ai agency admin')
    
    console.log('\n⚠️  IMPORTANT:')
    console.log('- This token is single-use only')
    console.log('- It will be consumed upon first successful use')
    console.log('- If it fails, run this script again to get a new token')
    
    return {
      user,
      invitationUrl,
      expiresAt: invitationTokenExpires
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the regeneration
if (require.main === module) {
  regenerateInvitationToken()
    .then((result) => {
      if (result) {
        console.log('\n✅ Invitation token regenerated successfully!')
        process.exit(0)
      } else {
        console.log('\n❌ Failed to regenerate invitation token!')
        process.exit(1)
      }
    })
    .catch((error) => {
      console.error('❌ Regeneration failed:', error)
      process.exit(1)
    })
}

module.exports = { regenerateInvitationToken }