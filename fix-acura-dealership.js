#!/usr/bin/env node

/**
 * Fix Acura of Columbus Dealership Configuration
 * This script identifies and fixes the dealership setup issue
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixAcuraDealership() {
  console.log('🔧 FIXING ACURA OF COLUMBUS DEALERSHIP CONFIGURATION')
  console.log('===================================================')
  console.log('')

  try {
    // 1. Check what dealerships exist with "Acura" or "Columbus" in the name
    console.log('1️⃣ Searching for existing dealerships...')
    const existingDealerships = await prisma.dealerships.findMany({
      where: {
        OR: [
          { name: { contains: 'Acura', mode: 'insensitive' } },
          { name: { contains: 'Columbus', mode: 'insensitive' } },
          { id: 'dealer-acura-columbus' },
          { clientId: 'dealer-acura-columbus' }
        ]
      },
      include: {
        users: {
          select: { id: true, email: true, name: true }
        }
      }
    })

    console.log(`Found ${existingDealerships.length} related dealerships:`)
    existingDealerships.forEach(d => {
      console.log(`   🏢 ${d.name} (ID: ${d.id})`)
      console.log(`      Client ID: ${d.clientId || 'NULL'}`)
      console.log(`      Users: ${d.users.length}`)
      d.users.forEach(u => console.log(`        • ${u.email}`))
      console.log('')
    })

    // 2. Check if the correct dealership exists
    const correctDealership = await prisma.dealerships.findUnique({
      where: { id: 'dealer-acura-columbus' },
      include: {
        users: {
          select: { id: true, email: true, name: true }
        }
      }
    })

    if (correctDealership) {
      console.log('✅ Found correct dealership: dealer-acura-columbus')
      console.log(`   Name: ${correctDealership.name}`)
      console.log(`   Client ID: ${correctDealership.clientId || 'NULL'}`)
      console.log(`   Users: ${correctDealership.users.length}`)

      // Check if clientId is missing
      if (!correctDealership.clientId) {
        console.log('🔧 Fixing missing clientId...')
        const updated = await prisma.dealerships.update({
          where: { id: 'dealer-acura-columbus' },
          data: { clientId: 'dealer-acura-columbus' }
        })
        console.log('✅ ClientId updated to: dealer-acura-columbus')
      }

      // Check if users exist
      if (correctDealership.users.length === 0) {
        console.log('⚠️  No users found for Acura of Columbus')
        console.log('   This means webhooks will be orphaned!')
        console.log('')
        console.log('🔍 Solutions:')
        console.log('   1. Assign existing user to this dealership')
        console.log('   2. Create new user for this dealership')
        console.log('   3. Process orphaned tasks when user is created')
      }

    } else {
      console.log('❌ Correct dealership NOT FOUND: dealer-acura-columbus')
      console.log('')
      console.log('🔧 Creating dealership...')
      
      const newDealership = await prisma.dealerships.create({
        data: {
          id: 'dealer-acura-columbus',
          name: 'Acura of Columbus',
          agencyId: 'agency-jay-hatfield', // Default agency
          website: 'https://www.acuracolumbus.com/',
          clientId: 'dealer-acura-columbus',
          ga4PropertyId: '284944578',
          searchConsoleSiteUrl: 'https://www.acuracolumbus.com/',
          activePackageType: 'SILVER'
        }
      })
      
      console.log('✅ Created dealership: dealer-acura-columbus')
    }

    // 3. Check for any orphaned tasks that might belong to Acura
    console.log('')
    console.log('3️⃣ Checking for orphaned tasks...')
    const orphanedTasks = await prisma.orphaned_tasks.findMany({
      where: {
        OR: [
          { clientId: { contains: 'acura', mode: 'insensitive' } },
          { clientId: { contains: 'columbus', mode: 'insensitive' } },
          { clientId: 'dealer-acura-columbus' },
          { clientEmail: { contains: 'acura', mode: 'insensitive' } },
          { clientEmail: { contains: 'columbus', mode: 'insensitive' } }
        ],
        processed: false
      },
      orderBy: { createdAt: 'desc' }
    })

    if (orphanedTasks.length > 0) {
      console.log(`⚠️  Found ${orphanedTasks.length} orphaned tasks that might belong to Acura:`)
      orphanedTasks.forEach(task => {
        console.log(`   🔄 ${task.taskType} (${task.eventType})`)
        console.log(`      🆔 External ID: ${task.externalId}`)
        console.log(`      🔑 Client ID: ${task.clientId}`)
        console.log(`      📧 Client Email: ${task.clientEmail}`)
        console.log(`      ⏰ ${task.createdAt.toISOString()}`)
        console.log('')
      })
    } else {
      console.log('✅ No orphaned tasks found')
    }

    // 4. Provide next steps
    console.log('')
    console.log('📋 NEXT STEPS FOR SEOWORKS TEAM:')
    console.log('=================================')
    console.log('')
    console.log('✅ Webhook Configuration:')
    console.log('   URL: https://rylie-seo-hub.onrender.com/api/seoworks/webhook')
    console.log('   Method: POST')
    console.log('   Headers: {"x-api-key": "7f3e9b5d2a8c4f6e1b9d3c7a5e8f2b4d6c9a1e3f7b5d9c2a6e4f8b1d3c7a9e5f"}')
    console.log('')
    console.log('✅ Required webhook payload:')
    console.log('   {')
    console.log('     "eventType": "task.completed",')
    console.log('     "data": {')
    console.log('       "externalId": "unique-task-id",')
    console.log('       "clientId": "dealer-acura-columbus",  ← CRITICAL!')
    console.log('       "taskType": "blog|page|gbp_post|improvement",')
    console.log('       "status": "completed",')
    console.log('       "completionDate": "2025-08-15T14:30:00Z",')
    console.log('       "deliverables": [...]')
    console.log('     }')
    console.log('   }')
    console.log('')
    console.log('🚨 CRITICAL: The clientId MUST be "dealer-acura-columbus"')
    console.log('   If using different ID, tasks will be orphaned!')

  } catch (error) {
    console.error('💥 Script failed:', error.message)
  }
}

fixAcuraDealership()
  .then(() => {
    console.log('\n✅ Script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })