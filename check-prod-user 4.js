const { PrismaClient } = require('@prisma/client')

async function checkUser() {
  const prisma = new PrismaClient()
  
  try {
    const users = await prisma.users.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        name: true
      }
    })
    
    console.log('All users in database:')
    console.log(JSON.stringify(users, null, 2))
    
    const targetUser = await prisma.users.findUnique({
      where: { id: 'user-super-admin-001' }
    })
    
    console.log('\nTarget user (user-super-admin-001):')
    console.log(JSON.stringify(targetUser, null, 2))
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUser()