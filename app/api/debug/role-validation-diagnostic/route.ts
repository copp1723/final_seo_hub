import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from '@/lib/auth'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 ROLE VALIDATION DIAGNOSTIC - Starting comprehensive analysis')
    
    // Get current session
    const session = await getServerSession()
    console.log('📋 Session Data:', {
      userId: session?.user?.id,
      email: session?.user?.email,
      role: session?.user?.role,
      sessionExists: !!session
    })

    // Get ALL users and check for role mismatches
    const allUsers = await prisma.users.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isSuperAdmin: true,
        createdAt: true,
        updatedAt: true
      }
    })

    console.log('📊 Total users in database:', allUsers.length)

    // Analyze role mismatches
    const roleMismatches = allUsers.filter(user => {
      const roleIsSuperAdmin = user.role === 'SUPER_ADMIN'
      const flagIsSuperAdmin = user.isSuperAdmin === true
      return roleIsSuperAdmin !== flagIsSuperAdmin
    })

    console.log('⚠️  ROLE MISMATCHES DETECTED:', roleMismatches.length)
    roleMismatches.forEach(user => {
      console.log(`❌ MISMATCH - User: ${user.email}`, {
        id: user.id,
        role: user.role,
        isSuperAdmin: user.isSuperAdmin,
        expectedisSuperAdmin: user.role === 'SUPER_ADMIN'
      })
    })

    // Check specific user from original issue
    const specificUser = await prisma.users.findUnique({
      where: { id: '3e50bcc8-cd3e-4773-a790-e0570de37371' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isSuperAdmin: true,
        createdAt: true,
        updatedAt: true,
        agencyId: true,
        dealershipId: true
      }
    })

    console.log('🎯 SPECIFIC USER ANALYSIS (from original issue):', specificUser)

    if (specificUser) {
      const shouldBeSuperAdmin = specificUser.role === 'SUPER_ADMIN'
      const currentlySuperAdmin = specificUser.isSuperAdmin
      
      console.log('🔍 SPECIFIC USER VALIDATION:', {
        email: specificUser.email,
        role: specificUser.role,
        isSuperAdmin: specificUser.isSuperAdmin,
        shouldBeSuperAdmin,
        currentlySuperAdmin,
        hasMismatch: shouldBeSuperAdmin !== currentlySuperAdmin,
        createdAt: specificUser.createdAt,
        updatedAt: specificUser.updatedAt
      })
    }

    // Check code patterns that could cause this issue
    const codePatternAnalysis = {
      dualFieldCheckLocations: [
        'app/api/debug/setup-initial-users/route.ts:78-79',
        'app/api/auth/emergency-invite/route.ts:59',
        'app/api/auth/fix-super-admin/route.ts:57',
        'app/api/auth/bootstrap/route.ts:47'
      ],
      roleOnlyCheckLocations: [
        'middleware/middleware-simple.ts:25',
        'app/api/admin/agencies/route.ts:17',
        'app/api/super-admin/users/route.ts:29'
      ],
      potentialInconsistencies: 'Some user creation paths may only set role field'
    }

    console.log('🔧 CODE PATTERN ANALYSIS:', codePatternAnalysis)

    // Test current session authorization
    let sessionAuthTest = null
    if (session?.user) {
      sessionAuthTest = {
        userIdExists: !!session.user.id,
        emailExists: !!session.user.email,
        roleFromSession: session.user.role,
        roleCheckPasses: session.user.role === 'SUPER_ADMIN',
        // Note: session doesn't include isSuperAdmin field from simple auth
        sessionHasisSuperAdminField: 'isSuperAdmin' in session.user
      }
      console.log('🔑 SESSION AUTHORIZATION TEST:', sessionAuthTest)
    }

    return NextResponse.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      analysis: {
        totalUsers: allUsers.length,
        roleMismatchCount: roleMismatches.length,
        roleMismatches,
        specificUser,
        sessionData: session?.user || null,
        sessionAuthTest,
        codePatternAnalysis,
        recommendations: {
          immediate: 'Fix isSuperAdmin field for users with SUPER_ADMIN role',
          longTerm: 'Standardize on single role validation method',
          validation: 'Add database constraint to ensure role and isSuperAdmin consistency'
        }
      }
    })

  } catch (error) {
    console.error('❌ ROLE VALIDATION DIAGNOSTIC ERROR:', error)
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}