const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixAccountLinking() {
  try {
    console.log('🔍 Investigating account linking issue...')
    
    // Find the admin user
    const adminEmail = process.env.AGENCY_ADMIN_EMAIL || 'admin@example.com'
    const accessUser = await prisma.user.findUnique({
      where: { email: adminEmail },
      include: { accounts: true }
    })
    
    if (!accessUser) {
      console.log(`❌ Admin user not found: ${adminEmail}`)
      console.log('💡 Set AGENCY_ADMIN_EMAIL environment variable to specify the admin email')
      return
    }

    console.log(`✅ Found admin user (${adminEmail}):`, {
      id: accessUser.id,
      email: accessUser.email,
      role: accessUser.role,
      accountsCount: accessUser.accounts.length
    })
    
    // Find Josh's user and accounts
    const joshUser = await prisma.user.findUnique({
      where: { email: 'josh.copp@onekeel.ai' },
      include: { accounts: true }
    })
    
    console.log('✅ Found josh.copp@onekeel.ai user:', {
      id: joshUser.id,
      email: joshUser.email,
      role: joshUser.role,
      accountsCount: joshUser.accounts.length
    })
    
    console.log('🔍 Josh\'s Google accounts:')
    joshUser.accounts.forEach((account, index) => {
      console.log(`  ${index + 1}. Provider: ${account.provider}, ID: ${account.providerAccountId}`)
    })
    
    // The issue is that when the admin user tries to sign in,
    // NextAuth finds one of Josh's Google accounts and uses that
    // We need to ensure the admin user gets its own Google account
    
    console.log('\n🎯 SOLUTION:')
    console.log(`The ${adminEmail} user needs to sign in with a DIFFERENT Google account`)
    console.log('that is not already linked to josh.copp@onekeel.ai')
    console.log('\nCurrent Google accounts linked to Josh:')
    joshUser.accounts.forEach((account, index) => {
      console.log(`  - ${account.providerAccountId}`)
    })
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixAccountLinking()