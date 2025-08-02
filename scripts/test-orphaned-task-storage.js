/**
 * Test script for orphaned task storage functionality
 * This script demonstrates how the system handles webhooks for unknown dealerships
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testOrphanedTaskStorage() {
  console.log('🧪 Testing orphaned task storage functionality...\n')

  try {
    // 1. Test webhook payload for unknown dealership
    const testWebhookPayload = {
      eventType: 'task.completed',
      data: {
        externalId: 'test-task-123',
        clientId: 'unknown-dealership-456',
        clientEmail: 'test@unknowndealership.com',
        taskType: 'page',
        status: 'completed',
        completionDate: new Date().toISOString(),
        deliverables: [
          {
            type: 'page',
            title: 'Test SEO Page for Unknown Dealership',
            url: 'https://unknowndealership.com/new-page'
          }
        ]
      }
    }

    console.log('1. Creating orphaned task entry...')
    
    // Simulate what the webhook route would do when no user is found
    const orphanedTask = await prisma.orphaned_tasks.create({
      data: {
        externalId: testWebhookPayload.data.externalId,
        clientId: testWebhookPayload.data.clientId,
        clientEmail: testWebhookPayload.data.clientEmail,
        eventType: testWebhookPayload.eventType,
        taskType: testWebhookPayload.data.taskType,
        status: testWebhookPayload.data.status,
        completionDate: testWebhookPayload.data.completionDate,
        deliverables: testWebhookPayload.data.deliverables,
        rawPayload: testWebhookPayload,
        processed: false,
        notes: 'Test webhook received for unknown dealership - task orphaned for later processing'
      }
    })

    console.log('✅ Orphaned task created:', {
      id: orphanedTask.id,
      externalId: orphanedTask.externalId,
      clientEmail: orphanedTask.clientEmail,
      processed: orphanedTask.processed
    })

    // 2. Test retrieving orphaned tasks
    console.log('\n2. Retrieving orphaned tasks...')
    
    const orphanedTasks = await prisma.orphaned_tasks.findMany({
      where: {
        processed: false,
        clientEmail: 'test@unknowndealership.com'
      },
      orderBy: { createdAt: 'desc' }
    })

    console.log('✅ Found orphaned tasks:', orphanedTasks.length)
    orphanedTasks.forEach(task => {
      console.log(`   - Task ${task.externalId}: ${task.taskType} (${task.eventType})`)
    })

    // 3. Simulate user onboarding and processing orphaned tasks
    console.log('\n3. Simulating user creation and orphaned task processing...')
    
    // Create a test user (simulating onboarding)
    const testUser = await prisma.users.create({
      data: {
        email: 'test@unknowndealership.com',
        name: 'Test User',
        role: 'USER'
      }
    })

    console.log('✅ Test user created:', testUser.id)

    // Process orphaned tasks for this user
    const orphanedTasksForUser = await prisma.orphaned_tasks.findMany({
      where: {
        clientEmail: testUser.email,
        processed: false
      }
    })

    console.log(`Found ${orphanedTasksForUser.length} orphaned tasks to process`)

    for (const task of orphanedTasksForUser) {
      if (task.eventType === 'task.completed') {
        // Create a request from the orphaned task
        const newRequest = await prisma.requests.create({
          data: {
            userId: testUser.id,
            title: task.deliverables?.[0]?.title || `SEOWorks ${task.taskType} Task`,
            description: `Task created from orphaned SEOWorks task\n\nOriginal Task ID: ${task.externalId}\nCompleted: ${task.completionDate || new Date().toISOString()}`,
            type: task.taskType.toLowerCase(),
            status: 'COMPLETED',
            seoworksTaskId: task.externalId,
            completedAt: task.completionDate ? new Date(task.completionDate) : new Date(),
            completedTasks: task.deliverables || [],
            pagesCompleted: task.taskType.toLowerCase() === 'page' ? 1 : 0,
            blogsCompleted: task.taskType.toLowerCase() === 'blog' ? 1 : 0,
            gbpPostsCompleted: task.taskType.toLowerCase() === 'gbp_post' ? 1 : 0,
            improvementsCompleted: ['improvement', 'maintenance'].includes(task.taskType.toLowerCase()) ? 1 : 0
          }
        })

        // Mark orphaned task as processed
        await prisma.orphaned_tasks.update({
          where: { id: task.id },
          data: {
            processed: true,
            linkedRequestId: newRequest.id,
            notes: `${task.notes || ''}\n\nProcessed and linked to request ${newRequest.id} for user ${testUser.id}`
          }
        })

        console.log('✅ Created request from orphaned task:', {
          orphanedTaskId: task.id,
          newRequestId: newRequest.id,
          taskType: task.taskType
        })
      }
    }

    // 4. Verify the results
    console.log('\n4. Verifying results...')
    
    const processedTasks = await prisma.orphaned_tasks.findMany({
      where: {
        clientEmail: testUser.email,
        processed: true
      }
    })

    const createdRequests = await prisma.requests.findMany({
      where: {
        userId: testUser.id
      }
    })

    console.log('✅ Verification complete:')
    console.log(`   - Processed orphaned tasks: ${processedTasks.length}`)
    console.log(`   - Created requests: ${createdRequests.length}`)

    // 5. Cleanup test data
    console.log('\n5. Cleaning up test data...')
    
    await prisma.requests.deleteMany({
      where: { userId: testUser.id }
    })

    await prisma.orphaned_tasks.deleteMany({
      where: { clientEmail: 'test@unknowndealership.com' }
    })

    await prisma.users.delete({
      where: { id: testUser.id }
    })

    console.log('✅ Test data cleaned up')

    console.log('\n🎉 Orphaned task storage test completed successfully!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
if (require.main === module) {
  testOrphanedTaskStorage()
    .then(() => {
      console.log('✅ All tests passed!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Tests failed:', error)
      process.exit(1)
    })
}

module.exports = { testOrphanedTaskStorage }