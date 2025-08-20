#!/usr/bin/env npx tsx
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function debugPrismaData() {
  try {
    console.log('Testing Prisma dealership data...')
    
    // Test 1: Count total dealerships
    const count = await prisma.dealerships.count()
    console.log(`Total dealerships: ${count}`)
    
    // Test 2: Get first dealership with all fields
    const first = await prisma.dealerships.findFirst({
      select: {
        id: true,
        name: true,
        ga4PropertyId: true,
        website: true
      }
    })
    console.log('First dealership:', JSON.stringify(first, null, 2))
    
    // Test 3: Raw query to compare
    const raw = await prisma.$queryRaw<Array<{name: string, ga4PropertyId: string}>>`
      SELECT name, "ga4PropertyId" FROM dealerships LIMIT 1
    `
    console.log('Raw query result:', JSON.stringify(raw, null, 2))
    
    // Test 4: Check if there's a specific dealership
    const acme = await prisma.dealerships.findFirst({
      where: { name: 'Acme Auto Center' },
      select: {
        name: true,
        ga4PropertyId: true,
        website: true
      }
    })
    console.log('Acme dealership:', JSON.stringify(acme, null, 2))
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugPrismaData()