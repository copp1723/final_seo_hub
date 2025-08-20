#!/usr/bin/env node

/**
 * Add sample task data to showcase enhanced TaskCard with prominent "View Work" buttons
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addSampleTasks() {
  console.log('🚀 ADDING SAMPLE TASKS FOR UI TESTING');
  console.log('=' .repeat(50));
  
  try {
    // Find existing user and dealership
    const user = await prisma.users.findFirst();
    const dealership = await prisma.dealerships.findFirst({
      where: { clientId: 'dealer-acura-columbus' }
    });
    
    if (!user || !dealership) {
      console.log('❌ Need user and dealership data first');
      return;
    }

    console.log(`👤 Using user: ${user.email}`);
    console.log(`📍 Using dealership: ${dealership.name}`);

    // Clean up existing sample tasks
    await prisma.tasks.deleteMany({
      where: { 
        title: { contains: 'Sample Task' }
      }
    });

    // Create sample tasks with different statuses
    const sampleTasks = [
      {
        id: `task-completed-1-${Date.now()}`,
        userId: user.id,
        dealershipId: dealership.id,
        agencyId: null,
        updatedAt: new Date(),
        type: 'PAGE',
        status: 'COMPLETED',
        title: 'Sample Task - 2024 Acura MDX Landing Page',
        description: 'Create optimized landing page for MDX inventory in Columbus market',
        priority: 'HIGH',
        targetUrl: 'https://acuraofcolumbus.com/new-inventory/2024-mdx-columbus',
        completedAt: new Date()
      },
      {
        id: `task-completed-2-${Date.now()}`,
        userId: user.id,
        dealershipId: dealership.id,
        agencyId: null,
        updatedAt: new Date(),
        type: 'BLOG',
        status: 'COMPLETED',
        title: 'Sample Task - Blog: Top 5 Acura Safety Features',
        description: 'Write engaging blog post about Acura safety technology',
        priority: 'MEDIUM',
        targetUrl: 'https://acuraofcolumbus.com/blog/top-5-acura-safety-features-2024',
        completedAt: new Date()
      },
      {
        id: `task-in-progress-${Date.now()}`,
        userId: user.id,
        dealershipId: dealership.id,
        agencyId: null,
        updatedAt: new Date(),
        type: 'GBP_POST',
        status: 'IN_PROGRESS',
        title: 'Sample Task - GBP Post: January Specials',
        description: 'Create Google Business Profile post for monthly specials',
        priority: 'HIGH',
        targetUrl: null,
        completedAt: null
      },
      {
        id: `task-pending-${Date.now()}`,
        userId: user.id,
        dealershipId: dealership.id,
        agencyId: null,
        updatedAt: new Date(),
        type: 'IMPROVEMENT',
        status: 'PENDING',
        title: 'Sample Task - Homepage SEO Optimization',
        description: 'Optimize meta tags and schema markup for homepage',
        priority: 'MEDIUM',
        targetUrl: 'https://acuraofcolumbus.com',
        completedAt: null
      }
    ];

    // Create all sample tasks
    for (const taskData of sampleTasks) {
      await prisma.tasks.create({ data: taskData });
      console.log(`✅ Created: ${taskData.title} (${taskData.status})`);
    }

    console.log('');
    console.log('🎉 Sample tasks created successfully!');
    console.log('   Navigate to /tasks to see:');
    console.log('   • Completed tasks with prominent "View Work" buttons');
    console.log('   • In progress and pending tasks with action buttons');
    console.log('   • Enhanced task card design');

  } catch (error) {
    console.error('❌ Error adding sample tasks:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
addSampleTasks().catch(console.error);