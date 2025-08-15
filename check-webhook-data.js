#!/usr/bin/env node

/**
 * Emergency Database Check for SEOWorks Webhook Data
 * Check if data from Acura of Columbus came through
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkWebhookData() {
  console.log('🚨 EMERGENCY: Checking for Acura of Columbus webhook data')
  console.log('=======================================================')
  console.log(`⏰ Check time: ${new Date().toISOString()}`)
  console.log('')

  try {
    // 1. Check for recent requests (last 30 minutes)
    console.log('1️⃣ Checking recent requests...')
    const recentRequests = await prisma.requests.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 30 * 60 * 1000) // Last 30 minutes
        }
      },
      include: {
        users: {
          select: { email: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    if (recentRequests.length > 0) {
      console.log(`✅ Found ${recentRequests.length} recent requests:`)
      recentRequests.forEach(req => {
        console.log(`   📝 ${req.title} (${req.type})`)
        console.log(`      👤 ${req.users?.email || 'Unknown'}`)
        console.log(`      🔗 SEOWorks ID: ${req.seoworksTaskId || 'None'}`)
        console.log(`      ⏰ ${req.createdAt.toISOString()}`)
        console.log(`      📊 Status: ${req.status}`)
        console.log('')
      })
    } else {
      console.log('❌ No recent requests found')
    }

    // 2. Check for orphaned tasks (last 30 minutes)
    console.log('2️⃣ Checking recent orphaned tasks...')
    const orphanedTasks = await prisma.orphaned_tasks.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 30 * 60 * 1000) // Last 30 minutes
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    if (orphanedTasks.length > 0) {
      console.log(`⚠️  Found ${orphanedTasks.length} orphaned tasks:`)
      orphanedTasks.forEach(task => {
        console.log(`   🔄 ${task.taskType} (${task.eventType})`)
        console.log(`      🔑 Client ID: ${task.clientId || 'None'}`)
        console.log(`      📧 Client Email: ${task.clientEmail || 'None'}`)
        console.log(`      🆔 External ID: ${task.externalId}`)
        console.log(`      ⏰ ${task.createdAt.toISOString()}`)
        console.log(`      🎯 Processed: ${task.processed}`)
        console.log('')
      })
    } else {
      console.log('❌ No recent orphaned tasks found')
    }

    // 3. Check for Acura of Columbus dealership
    console.log('3️⃣ Checking Acura of Columbus dealership...')
    const acuraDealership = await prisma.dealerships.findFirst({
      where: {
        OR: [
          { id: 'dealer-acura-columbus' },
          { name: { contains: 'Acura', mode: 'insensitive' } },
          { name: { contains: 'Columbus', mode: 'insensitive' } },
          { clientId: 'dealer-acura-columbus' }
        ]
      },
      include: {
        users: {
          select: { id: true, email: true, name: true }
        }
      }
    })

    if (acuraDealership) {
      console.log('✅ Found Acura dealership:')
      console.log(`   🏢 Name: ${acuraDealership.name}`)
      console.log(`   🆔 ID: ${acuraDealership.id}`)
      console.log(`   🔗 Client ID: ${acuraDealership.clientId}`)
      console.log(`   👥 Users: ${acuraDealership.users.length}`)
      acuraDealership.users.forEach(user => {
        console.log(`      • ${user.email} (${user.name || 'No name'})`)
      })
      console.log('')
    } else {
      console.log('❌ Acura of Columbus dealership NOT FOUND')
      console.log('   🚨 This might be why webhooks are being orphaned!')
      console.log('')
    }

    // 4. Check for any SEOWorks-related tasks
    console.log('4️⃣ Checking recent SEOWorks tasks...')
    const seoworksTasks = await prisma.seoworks_tasks.findMany({
      where: {
        receivedAt: {
          gte: new Date(Date.now() - 30 * 60 * 1000) // Last 30 minutes
        }
      },
      orderBy: { receivedAt: 'desc' }
    })

    if (seoworksTasks.length > 0) {
      console.log(`✅ Found ${seoworksTasks.length} recent SEOWorks tasks:`)
      seoworksTasks.forEach(task => {
        console.log(`   📋 ${task.postTitle}`)
        console.log(`      🆔 External ID: ${task.externalId}`)
        console.log(`      📊 Type: ${task.taskType}`)
        console.log(`      ⏰ ${task.receivedAt.toISOString()}`)
        console.log('')
      })
    } else {
      console.log('❌ No recent SEOWorks tasks found')
    }

    // 5. Search for any Acura-related content in last hour
    console.log('5️⃣ Searching for any Acura-related content...')
    
    const acuraRequests = await prisma.requests.findMany({
      where: {
        OR: [
          { title: { contains: 'acura', mode: 'insensitive' } },
          { title: { contains: 'columbus', mode: 'insensitive' } },
          { description: { contains: 'acura', mode: 'insensitive' } },
          { description: { contains: 'columbus', mode: 'insensitive' } }
        ],
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
        }
      },
      include: {
        users: { select: { email: true } }
      }
    })

    if (acuraRequests.length > 0) {
      console.log(`🎯 Found ${acuraRequests.length} Acura-related requests:`)
      acuraRequests.forEach(req => {
        console.log(`   📝 ${req.title}`)
        console.log(`      👤 ${req.users?.email}`)
        console.log(`      ⏰ ${req.createdAt.toISOString()}`)
        console.log('')
      })
    } else {
      console.log('❌ No Acura-related requests found')
    }

  } catch (error) {
    console.error('💥 Database check failed:', error.message)
    console.error('🔧 Make sure DATABASE_URL is set correctly')
  }

  console.log('📊 SUMMARY:')
  console.log('===========')
  const totalRecentData = (recentRequests?.length || 0) + (orphanedTasks?.length || 0)
  if (totalRecentData === 0) {
    console.log('🚨 NO WEBHOOK DATA RECEIVED')
    console.log('   Possible issues:')
    console.log('   • Webhook URL incorrect in SEOWorks')
    console.log('   • API key authentication failing')
    console.log('   • Rate limiting blocking requests')
    console.log('   • Application not running')
    console.log('')
    console.log('🔍 Next steps:')
    console.log('   1. Verify webhook URL: https://rylie-seo-hub.onrender.com/api/seoworks/webhook')
    console.log('   2. Check SEOWORKS_WEBHOOK_SECRET configuration')
    console.log('   3. Ask SEOWorks team to resend with debugging info')
  } else {
    console.log('✅ Webhook data was received!')
  }
}

checkWebhookData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Script failed:', error)
    process.exit(1)
  })