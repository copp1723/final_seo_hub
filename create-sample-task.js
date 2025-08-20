
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    // Sample task from your logs
    const sampleTask = {
      title: 'Why the 2026 Ram 1500 Is the Ultimate Pickup Upgrade in Columbus, IN',
      type: 'BLOG',
      seoworksId: 'task-b-67136',
      dealershipId: 'dealer-jhc-columbus',
      completedAt: '2025-08-19T20:25:00.899Z'
    };
    
    // Get admin user
    const adminUser = await prisma.users.findUnique({
      where: { email: 'josh.copp@onekeel.ai' }
    });
    
    // Check if already exists
    const existing = await prisma.seoworks_task_mappings.findUnique({
      where: { seoworksTaskId: sampleTask.seoworksId }
    });
    
    if (existing) {
      console.log('✅ Task already exists:', sampleTask.title);
    } else {
      // Create the task
      const request = await prisma.requests.create({
        data: {
            id: require("crypto").randomUUID(),
          title: sampleTask.title,
          type: sampleTask.type,
          status: 'COMPLETED',
          userId: adminUser.id,
          agencyId: adminUser.agencyId,
          dealershipId: sampleTask.dealershipId,
          seoworksTaskId: sampleTask.seoworksId,
          description: sampleTask.title,
          completedAt: new Date(sampleTask.completedAt),
          createdAt: new Date(sampleTask.completedAt),
          updatedAt: new Date()
        }
      });
      
      // Create mapping
      await prisma.seoworks_task_mappings.create({
        data: {
            id: require("crypto").randomUUID(),
          seoworksTaskId: sampleTask.seoworksId,
          description: sampleTask.title,
          requestId: request.id,
          dealershipId: sampleTask.dealershipId,
          taskType: sampleTask.type,
          status: 'COMPLETED',
          createdAt: new Date(sampleTask.completedAt),
          updatedAt: new Date()
        }
      });
      
      console.log('✅ Created task:', sampleTask.title);
      console.log('✅ Request ID:', request.id);
    }
    
    // Count total tasks
    const total = await prisma.requests.count();
    console.log('📊 Total tasks in database:', total);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();

