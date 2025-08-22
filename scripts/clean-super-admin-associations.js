const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function cleanSuperAdminAssociations() {
  try {
    console.log('🔧 Cleaning SUPER_ADMIN user associations...')
    
    // Find all SUPER_ADMIN users with incorrect associations
    const superAdminsWithAssociations = await prisma.users.findMany({
      where: {
        role: 'SUPER_ADMIN',
        OR: [
          { agencyId: { not: null } },
          { dealershipId: { not: null } }
        ]
      },
      include: {
        agencies: {
          select: { name: true }
        }
      }
    })
    
    if (superAdminsWithAssociations.length === 0) {
      console.log('✅ All SUPER_ADMIN users are already clean!')
      return
    }
    
    console.log(`\n⚠️  Found ${superAdminsWithAssociations.length} SUPER_ADMIN users with incorrect associations:`)
    superAdminsWithAssociations.forEach(u => {
      console.log(`   • ${u.email}`)
      console.log(`     - agencyId: ${u.agencyId} (${u.agencies?.name || 'none'})`)
      console.log(`     - dealershipId: ${u.dealershipId}`)
    })
    
    console.log('\n🧹 Removing associations...')
    
    // Clean up all SUPER_ADMIN users - remove agency and dealership associations
    const result = await prisma.users.updateMany({
      where: {
        role: 'SUPER_ADMIN',
        OR: [
          { agencyId: { not: null } },
          { dealershipId: { not: null } }
        ]
      },
      data: {
        agencyId: null,
        dealershipId: null,
        currentDealershipId: null // Also clear any session dealership selection
      }
    })
    
    console.log(`✅ Cleaned ${result.count} SUPER_ADMIN users`)
    
    // Verify the cleanup
    const remainingAssociations = await prisma.users.findMany({
      where: {
        role: 'SUPER_ADMIN',
        OR: [
          { agencyId: { not: null } },
          { dealershipId: { not: null } }
        ]
      }
    })
    
    if (remainingAssociations.length === 0) {
      console.log('🎉 All SUPER_ADMIN users are now properly configured as system administrators!')
    } else {
      console.log(`❌ Warning: ${remainingAssociations.length} SUPER_ADMIN users still have associations`)
    }
    
    // Show final state
    console.log('\n📋 Final SUPER_ADMIN user state:')
    const allSuperAdmins = await prisma.users.findMany({
      where: { role: 'SUPER_ADMIN' },
      select: { email: true, agencyId: true, dealershipId: true }
    })
    
    allSuperAdmins.forEach(u => {
      console.log(`   • ${u.email} | agency: ${u.agencyId || 'none'} | dealership: ${u.dealershipId || 'none'}`)
    })
    
  } catch (error) {
    console.error('❌ Error cleaning SUPER_ADMIN associations:', error)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  cleanSuperAdminAssociations()
}

module.exports = { cleanSuperAdminAssociations }