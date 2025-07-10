const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixAccountLinking() {
  try {
    console.log('🔍 Investigating account linking issue...')
    
    // Find the access@seowerks.ai user
    const accessUser = await prisma.user.findUnique({
      where: { email: 'access@seowerks.ai' },
      include: { accounts: true }
    })
    
    if (!accessUser) {
      console.log('❌ access@seowerks.ai user not found')
      return
    }
    
    console.log('✅ Found access@seowerks.ai user:', {
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
    
    // The issue is that when access@seowerks.ai tries to sign in,
    // NextAuth finds one of Josh's Google accounts and uses that
    // We need to ensure access@seowerks.ai gets its own Google account
    
    console.log('\n🎯 SOLUTION:')
    console.log('The access@seowerks.ai user needs to sign in with a DIFFERENT Google account')
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