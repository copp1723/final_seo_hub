const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createManualLoginSession() {
  try {
    console.log('🔑 Creating manual login session for OneKeel.ai admin...')
    
    const email = 'seo-access@onekeel.ai'
    
    // Find the user
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
    
    console.log(`✅ Found user: ${user.email}`)
    console.log(`   Role: ${user.role}`)
    console.log(`   Agency: ${user.agencies?.name} (${user.agencyId})`)
    
    // Clear any existing invitation token since we're doing manual login
    await prisma.users.update({
      where: { id: user.id },
      data: {
        invitationToken: null,
        invitationTokenExpires: null,
        emailVerified: new Date() // Mark email as verified
      }
    })
    
    console.log('✅ Invitation token cleared and email verified')
    
    // Since the invitation system is having redirect issues, let's provide alternative access methods
    console.log('\n🔐 MANUAL LOGIN OPTIONS:')
    console.log('=' * 50)
    
    console.log('\n1. 📧 EMAIL/PASSWORD LOGIN:')
    console.log('   Since this is an agency admin account, you can set a password manually.')
    console.log('   Go to: https://rylie-seo-hub.onrender.com/auth/signin')
    console.log('   Click "Sign in with Email" and follow the password reset flow.')
    
    console.log('\n2. 🚀 DIRECT DASHBOARD ACCESS:')
    console.log('   The invitation redirect issue is on the production server.')
    console.log('   Alternative: Access the dashboard directly after deployment fix.')
    
    console.log('\n3. 🔧 IMMEDIATE FIX NEEDED:')
    console.log('   The issue is that production environment redirects to localhost.')
    console.log('   This needs to be fixed in the Render deployment.')
    
    // Let's also create a magic login token that doesn't expire quickly
    const crypto = require('crypto')
    const longTermToken = crypto.randomBytes(32).toString('hex')
    const longTermExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    
    await prisma.users.update({
      where: { id: user.id },
      data: {
        invitationToken: longTermToken,
        invitationTokenExpires: longTermExpiry
      }
    })
    
    console.log('\n🎫 NEW LONG-TERM INVITATION TOKEN:')
    console.log(`https://rylie-seo-hub.onrender.com/api/invitation?token=${longTermToken}`)
    console.log(`Expires: ${longTermExpiry.toISOString()}`)
    console.log('⚠️  Note: This will still have the same redirect issue until production is fixed.')
    
    console.log('\n📋 RECOMMENDED NEXT STEPS:')
    console.log('1. Deploy the redirect fix to production')
    console.log('2. Test the invitation URL again')
    console.log('3. If still failing, use password reset flow')
    
    return {
      user,
      longTermToken,
      dashboardUrl: 'https://rylie-seo-hub.onrender.com/dashboard',
      signinUrl: 'https://rylie-seo-hub.onrender.com/auth/signin'
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the manual session creation
if (require.main === module) {
  createManualLoginSession()
    .then((result) => {
      if (result) {
        console.log('\n✅ Manual login session prepared!')
        process.exit(0)
      } else {
        console.log('\n❌ Failed to prepare manual login!')
        process.exit(1)
      }
    })
    .catch((error) => {
      console.error('❌ Preparation failed:', error)
      process.exit(1)
    })
}

module.exports = { createManualLoginSession }