const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')

const prisma = new PrismaClient()

async function createOneKeelSession() {
  try {
    console.log('🔑 Creating OneKeel.ai admin session...')
    
    const email = 'seo-access@onekeel.ai'
    
    // Find the OneKeel.ai admin user
    const user = await prisma.users.findUnique({
      where: { email },
      include: {
        agencies: true,
        dealerships: true
      }
    })
    
    if (!user) {
      console.log(`❌ User ${email} not found`)
      return
    }
    
    console.log(`✅ Found OneKeel.ai admin: ${user.email}`)
    console.log(`   Agency: ${user.agencies?.name} (${user.agencyId})`)
    console.log(`   Role: ${user.role}`)
    
    // Generate a new invitation token for direct login
    const invitationToken = crypto.randomBytes(32).toString('hex')
    const invitationTokenExpires = new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours
    
    // Update user with new invitation token
    await prisma.users.update({
      where: { id: user.id },
      data: {
        invitationToken,
        invitationTokenExpires,
        emailVerified: new Date(),
        onboardingCompleted: true
      }
    })
    
    const baseUrl = 'https://rylie-seo-hub.onrender.com'
    
    console.log('\n🎯 ONEKEEL.AI DIRECT ACCESS:')
    console.log('=' * 50)
    
    // Provide multiple options
    console.log('\n1. 🔑 DIRECT LOGIN (Recommended):')
    const loginUrl = `${baseUrl}/api/invitation?token=${invitationToken}`
    console.log(`   ${loginUrl}`)
    console.log('   This will log you in directly as OneKeel.ai admin')
    
    console.log('\n2. 📊 AGENCY DASHBOARD URLs (after login):')
    console.log(`   Dashboard with filter: ${baseUrl}/dashboard?agency=${user.agencyId}`)
    console.log(`   Agency-specific URL: ${baseUrl}/agency/onekeel-ai`)
    
    console.log('\n3. 🏢 DEALERSHIP ACCESS:')
    if (user.agencies) {
      const dealerships = await prisma.dealerships.findMany({
        where: { agencyId: user.agencyId }
      })
      
      dealerships.forEach((dealership, index) => {
        console.log(`   ${index + 1}. ${dealership.name} (ID: ${dealership.id})`)
      })
    }
    
    console.log('\n⏰ Session expires in 2 hours')
    console.log('🔄 If needed, run this script again to generate a new session')
    
    console.log('\n📋 LOGOUT WORKAROUND:')
    console.log('1. Clear browser cookies for rylie-seo-hub.onrender.com')
    console.log('2. Or use incognito/private browsing mode')
    console.log('3. Then use the direct login URL above')
    
    return {
      user,
      loginUrl,
      agencyId: user.agencyId,
      expiresAt: invitationTokenExpires
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the session creation
if (require.main === module) {
  createOneKeelSession()
    .then((result) => {
      if (result) {
        console.log('\n✅ OneKeel.ai session created successfully!')
        process.exit(0)
      } else {
        console.log('\n❌ Failed to create OneKeel.ai session!')
        process.exit(1)
      }
    })
    .catch((error) => {
      console.error('❌ Session creation failed:', error)
      process.exit(1)
    })
}

module.exports = { createOneKeelSession }