/**
 * ROLE VALIDATION FIX SCRIPT
 * 
 * This script fixes the critical role validation inconsistency where users have:
 * - role: "SUPER_ADMIN" (correct)
 * - isSuperAdmin: false (incorrect - should be true)
 * 
 * Based on the original issue data:
 * - User ID: 3e50bcc8-cd3e-4773-a790-e0570de37371
 * - Email: josh.copp@onekeel.ai
 * - Role: SUPER_ADMIN ✅
 * - isSuperAdmin: false ❌ (should be true)
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixRoleValidationMismatch() {
  console.log('🔧 ROLE VALIDATION FIX - Starting database correction')
  console.log('====================================================')
  
  try {
    // Step 1: Identify users with role validation mismatches
    console.log('🔍 Step 1: Identifying users with role validation mismatches...')
    
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

    console.log(`📊 Found ${usersWithMismatch.length} users with role validation mismatches`)
    
    if (usersWithMismatch.length === 0) {
      console.log('✅ No role validation mismatches found - database is consistent!')
      return {
        status: 'success',
        message: 'No fixes needed',
        usersFixed: 0
      }
    }

    // Display mismatches
    console.log('\n⚠️  MISMATCHES DETECTED:')
    usersWithMismatch.forEach((user, index) => {
      console.log(`${index + 1}. User: ${user.email}`)
      console.log(`   ID: ${user.id}`)
      console.log(`   Role: ${user.role} (correct)`)
      console.log(`   isSuperAdmin: ${user.isSuperAdmin} (incorrect - should be true)`)
      console.log(`   Created: ${user.createdAt}`)
      console.log('   ---')
    })

    // Step 2: Fix the mismatches
    console.log('\n🔧 Step 2: Fixing role validation mismatches...')
    
    const updatePromises = usersWithMismatch.map(async (user) => {
      console.log(`   Fixing user: ${user.email} (${user.id})`)
      
      const updatedUser = await prisma.users.update({
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
      
      console.log(`   ✅ Fixed: ${updatedUser.email} - isSuperAdmin now: ${updatedUser.isSuperAdmin}`)
      return updatedUser
    })

    const updatedUsers = await Promise.all(updatePromises)

    // Step 3: Verify the fix
    console.log('\n✅ Step 3: Verifying fixes...')
    
    const remainingMismatches = await prisma.users.findMany({
      where: {
        role: 'SUPER_ADMIN',
        isSuperAdmin: false
      }
    })

    if (remainingMismatches.length > 0) {
      console.error(`❌ Fix incomplete - ${remainingMismatches.length} mismatches still remain`)
      return {
        status: 'partial_success',
        message: 'Some mismatches remain',
        usersFixed: updatedUsers.length,
        remainingIssues: remainingMismatches.length
      }
    }

    // Step 4: Final verification
    const allSuperAdminUsers = await prisma.users.findMany({
      where: { role: 'SUPER_ADMIN' },
      select: {
        id: true,
        email: true,
        role: true,
        isSuperAdmin: true
      }
    })

    const allConsistent = allSuperAdminUsers.every(user => 
      user.role === 'SUPER_ADMIN' && user.isSuperAdmin === true
    )

    console.log('\n🎉 ROLE VALIDATION FIX COMPLETED SUCCESSFULLY!')
    console.log('===============================================')
    console.log(`✅ Users fixed: ${updatedUsers.length}`)
    console.log(`✅ All SUPER_ADMIN users now consistent: ${allConsistent}`)
    console.log(`✅ Total SUPER_ADMIN users: ${allSuperAdminUsers.length}`)
    
    console.log('\n📋 Summary of fixed users:')
    updatedUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} - Role: ${user.role}, isSuperAdmin: ${user.isSuperAdmin}`)
    })

    return {
      status: 'success',
      message: 'Role validation inconsistencies fixed successfully',
      usersFixed: updatedUsers.length,
      fixedUsers: updatedUsers,
      allConsistent
    }

  } catch (error) {
    console.error('❌ ROLE VALIDATION FIX ERROR:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the fix if this script is executed directly
if (require.main === module) {
  fixRoleValidationMismatch()
    .then((result) => {
      console.log('\n🎯 Final Result:', result)
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error)
      process.exit(1)
    })
}

module.exports = { fixRoleValidationMismatch }