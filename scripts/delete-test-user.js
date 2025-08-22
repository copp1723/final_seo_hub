const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function deleteTestUser() {
  const testUserEmail = 'test@acuraofcolumbus.com'
  
  try {
    console.log(`🔍 Looking for test user: ${testUserEmail}`)
    
    // Find the test user
    const testUser = await prisma.users.findUnique({
      where: { email: testUserEmail },
      include: {
        _count: {
          select: {
            requests: true,
            tasks: true
          }
        }
      }
    })
    
    if (!testUser) {
      console.log('❌ Test user not found!')
      return
    }
    
    console.log(`✅ Found test user: ${testUser.name} (${testUser.email})`)
    console.log(`   • Requests: ${testUser._count.requests}`)
    console.log(`   • Tasks: ${testUser._count.tasks}`)
    
    console.log('\n🗑️ Deleting associated data...')
    
    // Delete tasks first (they reference requests)
    const deletedTasks = await prisma.tasks.deleteMany({
      where: { userId: testUser.id }
    })
    console.log(`   • Deleted ${deletedTasks.count} tasks`)
    
    // Delete seoworks task mappings for user's requests
    const userRequests = await prisma.requests.findMany({
      where: { userId: testUser.id },
      select: { id: true }
    })
    
    if (userRequests.length > 0) {
      const requestIds = userRequests.map(r => r.id)
      const deletedMappings = await prisma.seoworks_task_mappings.deleteMany({
        where: { requestId: { in: requestIds } }
      })
      console.log(`   • Deleted ${deletedMappings.count} SEOWorks task mappings`)
    }
    
    // Delete requests
    const deletedRequests = await prisma.requests.deleteMany({
      where: { userId: testUser.id }
    })
    console.log(`   • Deleted ${deletedRequests.count} requests`)
    
    // Delete user dealership access records
    const deletedAccess = await prisma.user_dealership_access.deleteMany({
      where: { userId: testUser.id }
    })
    console.log(`   • Deleted ${deletedAccess.count} dealership access records`)
    
    // Delete any accounts (OAuth)
    const deletedAccounts = await prisma.accounts.deleteMany({
      where: { userId: testUser.id }
    })
    console.log(`   • Deleted ${deletedAccounts.count} OAuth accounts`)
    
    // Delete any sessions
    const deletedSessions = await prisma.sessions.deleteMany({
      where: { userId: testUser.id }
    })
    console.log(`   • Deleted ${deletedSessions.count} sessions`)
    
    // Finally, delete the user
    await prisma.users.delete({
      where: { id: testUser.id }
    })
    
    console.log(`\n✅ Successfully deleted test user: ${testUser.email}`)
    console.log('🎉 Cleanup completed!')
    
  } catch (error) {
    console.error('❌ Error deleting test user:', error)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  deleteTestUser()
}

module.exports = { deleteTestUser }