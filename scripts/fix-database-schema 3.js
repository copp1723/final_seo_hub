#!/usr/bin/env node
/**
 * Database Schema Fix Script
 * 
 * This script fixes the database schema issues identified in the deployment diagnostics.
 * Run this script to apply the necessary fixes to your database.
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixDatabaseSchema() {
  console.log('🔧 Starting database schema fix...')

  try {
    // 1. Check if clientId column exists
    const clientIdExists = await prisma.$queryRaw`
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_name = 'dealerships' 
      AND column_name = 'clientId'
    `

    if (clientIdExists.length === 0) {
      console.log('➕ Adding missing clientId column to dealerships table...')
      
      // Add the missing clientId column
      await prisma.$executeRaw`
        ALTER TABLE "dealerships" 
        ADD COLUMN IF NOT EXISTS "clientId" VARCHAR(255) UNIQUE
      `
      console.log('✅ clientId column added successfully')
    } else {
      console.log('✅ clientId column already exists')
    }

    // 2. Check if super admin user exists
    const superAdminUser = await prisma.users.findFirst({
      where: {
        OR: [
          { email: 'josh.copp@onekeel.ai' },
          { isSuperAdmin: true }
        ]
      }
    })

    if (!superAdminUser) {
      console.log('➕ Creating super admin user...')
      
      // Create super admin user
      await prisma.users.upsert({
        where: { email: 'josh.copp@onekeel.ai' },
        update: {
          role: 'SUPER_ADMIN',
          isSuperAdmin: true
        },
        create: {
          id: '3e50bcc8-cd3e-4773-a790-e0570de37371',
          email: 'josh.copp@onekeel.ai',
          name: 'Josh Copp',
          role: 'SUPER_ADMIN',
          isSuperAdmin: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      console.log('✅ Super admin user created successfully')
    } else {
      console.log('✅ Super admin user already exists')
    }

    // 3. Check dealership assignments
    const dealershipCount = await prisma.dealerships.count()
    if (dealershipCount === 0) {
      console.log('➕ Creating sample dealerships...')
      
      // Create sample dealerships
      await prisma.dealerships.createMany({
        data: [
          {
            id: 'sample-dealership-1',
            name: 'Sample Dealership 1',
            agencyId: 'sample-agency-1',
            clientId: 'client-001'
          },
          {
            id: 'sample-dealership-2',
            name: 'Sample Dealership 2',
            agencyId: 'sample-agency-1',
            clientId: 'client-002'
          }
        ]
      })
      console.log('✅ Sample dealerships created successfully')
    } else {
      console.log('✅ Dealerships already exist')
    }

    // 4. Verify the fix
    const verification = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'dealerships'
      ORDER BY ordinal_position
    `
    
    console.log('✅ Database schema verification complete:', verification)

    console.log('🎉 Database schema fix completed successfully!')
    
    return {
      success: true,
      message: 'Database schema has been successfully updated',
      details: {
        clientIdAdded: clientIdExists.length === 0,
        superAdminCreated: !superAdminUser,
        dealershipsCreated: dealershipCount === 0,
        verification: verification
      }
    }

  } catch (error) {
    console.error('❌ Database schema fix failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the fix
if (require.main === module) {
  fixDatabaseSchema()
    .then(result => console.log(result))
    .catch(error => console.error(error))
}

module.exports = { fixDatabaseSchema }