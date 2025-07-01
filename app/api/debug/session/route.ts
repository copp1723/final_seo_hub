import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await auth()
    
    let userData = null
    if (session?.user?.id) {
      userData = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          agencyId: true,
          onboardingCompleted: true,
          activePackageType: true,
          currentBillingPeriodStart: true,
          currentBillingPeriodEnd: true,
          pagesUsedThisPeriod: true,
          blogsUsedThisPeriod: true,
          gbpPostsUsedThisPeriod: true,
          improvementsUsedThisPeriod: true,
          createdAt: true,
          updatedAt: true,
        }
      })
    }
    
    return NextResponse.json({
      success: true,
      session: session ? {
        user: session.user,
        expires: session.expires,
      } : null,
      userData,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Session debug error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}