const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function debugUsers() {
  try {
    console.log('🔍 Checking all users...')
    
    const allUsers = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: 'seowerks' } },
          { email: { contains: 'onekeel' } }
        ]
      },
      select: {
        id: true,
        email: true,
        role: true,
        agencyId: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    })

    console.log(`Found ${allUsers.length} users:`)
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`)
      console.log(`   ID: ${user.id}`)
      console.log(`   Role: ${user.role}`)
      console.log(`   Agency ID: ${user.agencyId || 'null'}`)
      console.log(`   Created: ${user.createdAt}`)
      console.log(`   Updated: ${user.updatedAt}`)
      console.log('')
    })

    console.log('🏢 Checking agencies...')
    const agencies = await prisma.agency.findMany({
      select: {
        id: true,
        name: true,
        domain: true,
        createdAt: true,
        _count: {
          select: { users: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    console.log(`Found ${agencies.length} agencies:`)
    agencies.forEach((agency, index) => {
      console.log(`${index + 1}. ${agency.name}`)
      console.log(`   ID: ${agency.id}`)
      console.log(`   Domain: ${agency.domain || 'null'}`)
      console.log(`   Users: ${agency._count.users}`)
      console.log(`   Created: ${agency.createdAt}`)
      console.log('')
    })

    console.log('🔗 Checking accounts...')
    const accounts = await prisma.account.findMany({
      include: {
        user: {
          select: {
            email: true,
            role: true
          }
        }
      },
      orderBy: { id: 'desc' }
    })

    console.log(`Found ${accounts.length} OAuth accounts:`)
    accounts.forEach((account, index) => {
      console.log(`${index + 1}. Provider: ${account.provider}`)
      console.log(`   User Email: ${account.user.email}`)
      console.log(`   User Role: ${account.user.role}`)
      console.log(`   Provider Account ID: ${account.providerAccountId}`)
      console.log('')
    })

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugUsers()