const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')

const prisma = new PrismaClient()

async function inviteSeoworksAdmin() {
  try {
    console.log('📧 Creating invitation for SEOWORKS admin...')
    
    // Find SEOWORKS agency
    const seoworksAgency = await prisma.agencies.findFirst({
      where: { name: 'SEOWORKS' }
    })
    
    if (!seoworksAgency) {
      console.error('❌ SEOWORKS agency not found')
      return
    }
    
    // Check if user already exists
    const existingUser = await prisma.users.findFirst({
      where: { email: 'access@seowerks.ai' }
    })
    
    if (existingUser) {
      console.log('✅ User already exists, updating invitation token...')
      
      // Generate new invitation token
      const token = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      
      await prisma.users.update({
        where: { id: existingUser.id },
        data: {
          invitationToken: token,
          invitationTokenExpires: expiresAt
        }
      })
      
      console.log('✅ Invitation token updated')
      console.log(`🔗 Magic login link: ${process.env.NEXTAUTH_URL || 'https://rylie-seo-hub.onrender.com'}/api/auth/simple-signin?email=access@seowerks.ai`)
      
    } else {
      console.log('Creating new user invitation...')
      
      // Create user invitation
      const token = crypto.randomBytes(32).toString('hex')
      
      const invitation = await prisma.user_invites.create({
        data: {
          email: 'access@seowerks.ai',
          role: 'AGENCY_ADMIN',
          agencyId: seoworksAgency.id,
          invitedBy: 'system', // Will need to update this to actual super admin ID
          token: token,
          status: 'pending'
        }
      })
      
      console.log('✅ User invitation created')
      console.log(`🔗 Invitation link: ${process.env.NEXTAUTH_URL || 'https://rylie-seo-hub.onrender.com'}/auth/accept-invitation?token=${token}`)
    }
    
    console.log('🎉 SEOWORKS admin invitation ready!')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

inviteSeoworksAdmin() 