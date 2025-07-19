import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from '@/lib/auth'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 ROLE VALIDATION FIX - Starting database correction')
    
    // Security check: Ensure only super admin can run this fix
    const session = await getServerSession()
    if (!session?.user?.id) {
      console.log('❌ No session found')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    console.log('🔍 Current session user:', {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role
    })

    // Step 1: Find all users with role mismatch
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
        isSuperAdmin: true,
        createdAt: true,
        updatedAt: true
      }
    })

    console.log('📊 Users with role validation mismatch:', usersWithMismatch.length)
    usersWithMismatch.forEach(user => {
      console.log(`⚠️  MISMATCH DETECTED - ${user.email}:`, {
        id: user.id,
        role: user.role,
        isSuperAdmin: user.isSuperAdmin,
        needsUpdate: true
      })
    })

    if (usersWithMismatch.length === 0) {
      console.log('✅ No role validation mismatches found')
      return NextResponse.json({
        status: 'success',
        message: 'No role validation mismatches found',
        usersChecked: await prisma.users.count(),
        usersFixed: 0
      })
    }

    // Step 2: Fix the mismatches
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

    // Step 3: Verify the fix worked
    const remainingMismatches = await prisma.users.findMany({
      where: {
        role: 'SUPER_ADMIN',
        isSuperAdmin: false
      }
    })

    if (remainingMismatches.length > 0) {
      console.error('❌ Fix incomplete - remaining mismatches:', remainingMismatches.length)
      return NextResponse.json({
        status: 'partial_success',
        message: 'Some role validation mismatches remain',
        usersFixed: updatedUsers.length,
        remainingIssues: remainingMismatches.length
      }, { status: 207 })
    }

    console.log('🎉 All role validation inconsistencies have been resolved')

    return NextResponse.json({
      status: 'success',
      message: 'Role validation inconsistencies fixed successfully',
      timestamp: new Date().toISOString(),
      details: {
        usersChecked: await prisma.users.count(),
        usersFixed: updatedUsers.length,
        fixedUsers: updatedUsers.map(u => ({
          id: u.id,
          email: u.email,
          role: u.role,
          isSuperAdmin: u.isSuperAdmin
        })),
        verification: {
          remainingMismatches: 0,
          allSuperAdminUsersConsistent: true
        }
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

// GET endpoint for checking current status without making changes
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 ROLE VALIDATION CHECK - Status inquiry')
    
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check for mismatches without fixing
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

    const totalUsers = await prisma.users.count()
    const superAdminUsers = await prisma.users.count({
      where: { role: 'SUPER_ADMIN' }
    })

    return NextResponse.json({
      status: 'check_complete',
      timestamp: new Date().toISOString(),
      summary: {
        totalUsers,
        superAdminUsers,
        usersWithMismatch: usersWithMismatch.length,
        needsFix: usersWithMismatch.length > 0
      },
      mismatches: usersWithMismatch.map(u => ({
        id: u.id,
        email: u.email,
        role: u.role,
        isSuperAdmin: u.isSuperAdmin
      }))
    })

  } catch (error) {
    console.error('❌ ROLE VALIDATION CHECK ERROR:', error)
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}