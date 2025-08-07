const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function ensureDemoUser() {
  try {
    const user = await prisma.users.upsert({
      where: { id: 'user-super-admin-001' },
      update: {
        email: 'josh.copp@onekeel.ai',
        name: 'Josh Copp (Demo Super Admin)',
        role: 'SUPER_ADMIN'
      },
      create: {
        id: 'user-super-admin-001',
        email: 'josh.copp@onekeel.ai',
        name: 'Josh Copp (Demo Super Admin)',
        role: 'SUPER_ADMIN'
      }
    })
    console.log('Demo user ensured:', user)
  } catch (error) {
    console.error('Error ensuring demo user:', error)
  } finally {
    await prisma.$disconnect()
  }
}

ensureDemoUser()