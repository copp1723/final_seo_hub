const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function setupDirectLogin() {
  try {
    console.log('🔑 Setting up direct login for OneKeel.ai admin...')
    
    const email = 'seo-access@onekeel.ai'
    const password = 'OneKeel2025!' // Temporary password - user should change it
    
    // Find the user
    const user = await prisma.users.findUnique({
      where: { email }
    })
    
    if (!user) {
      console.log(`❌ User ${email} not found`)
      return
    }
    
    console.log(`✅ Found user: ${user.email}`)
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12)
    
    // Update user with password and clear invitation tokens
    await prisma.users.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        emailVerified: new Date(),
        invitationToken: null,
        invitationTokenExpires: null,
        onboardingCompleted: true
      }
    })
    
    console.log('✅ Password set and user configured for direct login')
    
    // Verify the user is properly set up
    const updatedUser = await prisma.users.findUnique({
      where: { email },
      include: {
        agencies: true
      }
    })
    
    console.log('\n🎯 DIRECT LOGIN READY!')
    console.log('=' * 40)
    console.log('🌐 Login URL: https://rylie-seo-hub.onrender.com/auth/signin')
    console.log('📧 Email:', email)
    console.log('🔐 Password:', password)
    console.log('🏢 Agency:', updatedUser.agencies?.name)
    console.log('👑 Role:', updatedUser.role)
    
    console.log('\n📋 LOGIN STEPS:')
    console.log('1. Go to: https://rylie-seo-hub.onrender.com/auth/signin')
    console.log('2. Click "Sign in with Email"')
    console.log('3. Enter email: seo-access@onekeel.ai')
    console.log('4. Enter password: OneKeel2025!')
    console.log('5. You will be logged into your OneKeel.ai agency dashboard')
    
    console.log('\n⚠️  SECURITY NOTE:')
    console.log('Please change this password after first login!')
    console.log('This is a temporary password for initial access.')
    
    return {
      email,
      password,
      loginUrl: 'https://rylie-seo-hub.onrender.com/auth/signin',
      dashboardUrl: 'https://rylie-seo-hub.onrender.com/dashboard'
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the setup
if (require.main === module) {
  setupDirectLogin()
    .then((result) => {
      if (result) {
        console.log('\n✅ Direct login setup completed!')
        process.exit(0)
      } else {
        console.log('\n❌ Direct login setup failed!')
        process.exit(1)
      }
    })
    .catch((error) => {
      console.error('❌ Setup failed:', error)
      process.exit(1)
    })
}

module.exports = { setupDirectLogin }