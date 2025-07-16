import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function POST() {
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

    const results = []

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

      const magicLink = `${process.env.NEXTAUTH_URL}/api/auth/accept-invitation?token=${invitationToken}`
      
      results.push({
        email: user.email,
        magicLink
      })

      console.log(`✅ Added token to ${user.email}`)
      console.log(`   Magic link: ${magicLink}`)
    }

    return NextResponse.json({
      success: true,
      message: `Added tokens to ${usersWithoutTokens.length} users`,
      users: results
    })
  } catch (error) {
    console.error('❌ Error:', error)
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 })
  }
}