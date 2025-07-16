const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')

const prisma = new PrismaClient()

async function addTokensToExistingUsers() {
  try {
    console.log('🔍 Finding users without invitation tokens...')
    
    const usersWithoutTokens = await prisma.users.findMany({
      where: {
        OR: [
          { invitationToken: null },
          { invitationToken: '' }
        ]
      },
      select: { id: true, email: true, name: true }
    })

    console.log(`Found ${usersWithoutTokens.length} users without tokens`)

    for (const user of usersWithoutTokens) {
      const invitationToken = crypto.randomBytes(32).toString('hex')
      const invitationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

      await prisma.users.update({
        where: { id: user.id },
        data: {
          invitationToken,
          invitationTokenExpires
        }
      })

      console.log(`✅ Added token to ${user.email}`)
      console.log(`   Magic link: ${process.env.NEXTAUTH_URL}/api/auth/accept-invitation?token=${invitationToken}`)
    }

    console.log('🎉 All users now have invitation tokens!')
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addTokensToExistingUsers()