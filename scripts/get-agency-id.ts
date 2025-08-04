import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function getAgencies() {
  const agencies = await prisma.agencies.findMany({
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          dealerships: true,
          users: true
        }
      }
    }
  })
  
  console.log('Current agencies:')
  agencies.forEach(agency => {
    console.log(`ID: ${agency.id}`)
    console.log(`Name: ${agency.name}`)
    console.log(`Dealerships: ${agency._count.dealerships}`)
    console.log(`Users: ${agency._count.users}`)
    console.log('---')
  })
}

getAgencies()
  .catch(console.error)
 .finally(() => prisma.$disconnect())
