#!/usr/bin/env node

/**
 * Real-time SEOWorks Data Monitor
 * 
 * This script monitors for incoming webhook data from SEOWorks and provides
 * real-time feedback on data reception and processing.
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

console.log('🔥 SEOWorks Real-Time Data Monitor')
console.log('=====================================')
console.log(`📅 Started at: ${new Date().toISOString()}`)
console.log(`🌍 Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`)
console.log('')

// Store baseline counts
let baselineData = {
  requests: 0,
  orphanedTasks: 0,
  tasks: 0,
  seoworksTasks: 0
}

async function getDataCounts() {
  try {
    const [requests, orphanedTasks, tasks, seoworksTasks] = await Promise.all([
      prisma.requests.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
          }
        }
      }),
      prisma.orphaned_tasks.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
          }
        }
      }),
      prisma.tasks.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
          }
        }
      }),
      prisma.seoworks_tasks.count({
        where: {
          receivedAt: {
            gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
          }
        }
      })
    ])

    return { requests, orphanedTasks, tasks, seoworksTasks }
  } catch (error) {
    console.error('❌ Database connection failed:', error.message)
    return null
  }
}

async function checkForNewData() {
  const current = await getDataCounts()
  
  if (!current) {
    return
  }

  const changes = {
    requests: current.requests - baselineData.requests,
    orphanedTasks: current.orphanedTasks - baselineData.orphanedTasks,
    tasks: current.tasks - baselineData.tasks,
    seoworksTasks: current.seoworksTasks - baselineData.seoworksTasks
  }

  const hasChanges = Object.values(changes).some(change => change > 0)

  if (hasChanges) {
    console.log(`🚨 NEW DATA DETECTED at ${new Date().toISOString()}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    if (changes.requests > 0) {
      console.log(`✅ NEW REQUESTS: +${changes.requests}`)
      
      // Get the latest requests
      try {
        const latestRequests = await prisma.requests.findMany({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
            }
          },
          include: {
            users: {
              select: { email: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        })

        latestRequests.forEach(req => {
          console.log(`   📝 ${req.title} (${req.type}) - ${req.status}`)
          console.log(`      👤 ${req.users?.email || 'Unknown user'}`)
          console.log(`      🔗 SEOWorks ID: ${req.seoworksTaskId || 'None'}`)
          console.log(`      ⏰ ${req.createdAt.toISOString()}`)
        })
      } catch (err) {
        console.log('   ⚠️  Could not fetch request details')
      }
    }

    if (changes.orphanedTasks > 0) {
      console.log(`⚠️  NEW ORPHANED TASKS: +${changes.orphanedTasks}`)
      
      // Get the latest orphaned tasks
      try {
        const latestOrphaned = await prisma.orphaned_tasks.findMany({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        })

        latestOrphaned.forEach(task => {
          console.log(`   🔄 ${task.taskType} task (${task.eventType})`)
          console.log(`      🔑 Client ID: ${task.clientId || 'None'}`)
          console.log(`      📧 Client Email: ${task.clientEmail || 'None'}`)
          console.log(`      🆔 External ID: ${task.externalId}`)
          console.log(`      ⏰ ${task.createdAt.toISOString()}`)
        })
      } catch (err) {
        console.log('   ⚠️  Could not fetch orphaned task details')
      }
    }

    if (changes.tasks > 0) {
      console.log(`📋 NEW TASKS: +${changes.tasks}`)
    }

    if (changes.seoworksTasks > 0) {
      console.log(`🔗 NEW SEOWORKS TASKS: +${changes.seoworksTasks}`)
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('')

    // Update baseline
    baselineData = current
  } else {
    process.stdout.write('.')
  }
}

async function main() {
  console.log('🔍 Establishing baseline...')
  
  baselineData = await getDataCounts()
  
  if (!baselineData) {
    console.error('❌ Failed to establish database connection')
    process.exit(1)
  }

  console.log('✅ Baseline established:')
  console.log(`   Requests (last hour): ${baselineData.requests}`)
  console.log(`   Orphaned Tasks (last hour): ${baselineData.orphanedTasks}`)
  console.log(`   Tasks (last hour): ${baselineData.tasks}`)
  console.log(`   SEOWorks Tasks (last hour): ${baselineData.seoworksTasks}`)
  console.log('')
  console.log('🔄 Monitoring for changes every 10 seconds...')
  console.log('   (. = no changes, 🚨 = new data detected)')
  console.log('')

  // Monitor every 10 seconds
  setInterval(checkForNewData, 10000)

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\n👋 Monitoring stopped')
    await prisma.$disconnect()
    process.exit(0)
  })
}

main().catch(async (error) => {
  console.error('💥 Monitor crashed:', error)
  await prisma.$disconnect()
  process.exit(1)
})