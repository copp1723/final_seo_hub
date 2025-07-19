import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    console.log('🔍 Checking database users and role validation...')
    
    // Get total user count
    const totalUsers = await prisma.users.count()
    console.log(`Total users in database: ${totalUsers}`)
    
    // Get sample of users (first 5, only email and role for privacy)
    const sampleUsers = await prisma.users.findMany({
      take: 5,
      select: {
        email: true,
        role: true,
        isSuperAdmin: true,
        agencyId: true,
        dealershipId: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    console.log('Sample users:', sampleUsers)

    // ROLE VALIDATION CHECK - Find mismatches
    const usersWithRoleMismatch = await prisma.users.findMany({
      where: {
        role: 'SUPER_ADMIN',
        isSuperAdmin: false
      },
      select: {
        id: true,
        email: true,
        role: true,
        isSuperAdmin: true,
        createdAt: true
      }
    })

    console.log('⚠️  ROLE VALIDATION MISMATCHES:', usersWithRoleMismatch.length)
    usersWithRoleMismatch.forEach(user => {
      console.log(`❌ MISMATCH - ${user.email}:`, {
        id: user.id,
        role: user.role,
        isSuperAdmin: user.isSuperAdmin,
        needsUpdate: true
      })
    })

    // Check for the specific user from the original issue
    const specificUser = await prisma.users.findUnique({
      where: { id: '3e50bcc8-cd3e-4773-a790-e0570de37371' },
      select: {
        id: true,
        email: true,
        role: true,
        isSuperAdmin: true,
        createdAt: true,
        updatedAt: true
      }
    })

    console.log('🎯 SPECIFIC USER FROM ISSUE:', specificUser)
    
    const diagnostics = {
      status: 'success',
      userCount: totalUsers,
      sampleUsers: sampleUsers.map(user => ({
        email: user.email,
        role: user.role,
        isSuperAdmin: user.isSuperAdmin,
        roleConsistent: (user.role === 'SUPER_ADMIN') === user.isSuperAdmin,
        hasAgency: !!user.agencyId,
        hasDealership: !!user.dealershipId,
        createdAt: user.createdAt
      })),
      roleValidation: {
        totalMismatches: usersWithRoleMismatch.length,
        mismatches: usersWithRoleMismatch.map(u => ({
          id: u.id,
          email: u.email,
          role: u.role,
          isSuperAdmin: u.isSuperAdmin,
          needsFix: true
        })),
        specificUser: specificUser ? {
          ...specificUser,
          hasRoleMismatch: specificUser.role === 'SUPER_ADMIN' && !specificUser.isSuperAdmin
        } : null
      },
      timestamp: new Date().toISOString()
    }
    
    return NextResponse.json(diagnostics)
    
  } catch (error) {
    console.error('❌ User check failed:', error)
    
    return NextResponse.json({
      status: 'error',
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// POST endpoint to fix role validation mismatches
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 ROLE VALIDATION FIX - Starting database correction')
    
    const body = await request.json().catch(() => ({}))
    const { confirm } = body

    if (!confirm) {
      return NextResponse.json({
        status: 'confirmation_required',
        message: 'Please confirm the fix by sending POST with {"confirm": true}',
        timestamp: new Date().toISOString()
      }, { status: 400 })
    }

    // Find all users with role mismatch
    const usersWithMismatch = await prisma.users.findMany({
      where: {
        role: 'SUPER_ADMIN',
        isSuperAdmin: false
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isSuperAdmin: true
      }
    })

    console.log('📊 Users with role validation mismatch:', usersWithMismatch.length)

    if (usersWithMismatch.length === 0) {
      console.log('✅ No role validation mismatches found')
      return NextResponse.json({
        status: 'success',
        message: 'No role validation mismatches found',
        usersChecked: await prisma.users.count(),
        usersFixed: 0
      })
    }

    // Fix the mismatches
    const updatePromises = usersWithMismatch.map(user => {
      console.log(`🔧 Fixing user: ${user.email} (${user.id})`)
      return prisma.users.update({
        where: { id: user.id },
        data: {
          isSuperAdmin: true,
          updatedAt: new Date()
        },
        select: {
          id: true,
          email: true,
          role: true,
          isSuperAdmin: true
        }
      })
    })

    const updatedUsers = await Promise.all(updatePromises)

    console.log('✅ ROLE VALIDATION FIX COMPLETED')
    updatedUsers.forEach(user => {
      console.log(`✅ FIXED - ${user.email}:`, {
        id: user.id,
        role: user.role,
        isSuperAdmin: user.isSuperAdmin,
        isNowConsistent: user.role === 'SUPER_ADMIN' && user.isSuperAdmin === true
      })
    })

    return NextResponse.json({
      status: 'success',
      message: 'Role validation inconsistencies fixed successfully',
      timestamp: new Date().toISOString(),
      details: {
        usersFixed: updatedUsers.length,
        fixedUsers: updatedUsers.map(u => ({
          id: u.id,
          email: u.email,
          role: u.role,
          isSuperAdmin: u.isSuperAdmin
        }))
      }
    })

  } catch (error) {
    console.error('❌ ROLE VALIDATION FIX ERROR:', error)
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}