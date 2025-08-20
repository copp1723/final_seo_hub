#!/usr/bin/env node

/**
 * Add sample request data to showcase the redesigned UI
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addSampleRequest() {
  console.log('🚀 ADDING SAMPLE REQUEST FOR UI TESTING');
  console.log('=' .repeat(50));
  
  try {
    // Find the first dealership to use
    const dealership = await prisma.dealerships.findFirst();
    if (!dealership) {
      console.log('❌ No dealership found. Need to have dealerships in database first.');
      return;
    }

    console.log(`📍 Using dealership: ${dealership.name}`);

    // Find a user to associate with
    const user = await prisma.users.findFirst();
    if (!user) {
      console.log('❌ No user found. Need to have users in database first.');
      return;
    }

    console.log(`👤 Using user: ${user.email}`);

    // Create sample request with completed tasks
    const sampleRequest = await prisma.requests.create({
      data: {
        id: `sample-request-${Date.now()}`,
        userId: user.id,
        dealershipId: dealership.id,
        agencyId: null,
        updatedAt: new Date(),
        title: `${dealership.name} - SEO Package`,
        description: 'Monthly SEO package with pages, blogs, and GBP posts',
        type: 'seo_package',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        packageType: 'GOLD',
        targetCities: ['Columbus', 'Dublin', 'Delaware', 'Westerville'],
        targetModels: ['Accord', 'Civic', 'CR-V', 'Pilot'],
        keywords: ['honda dealer columbus', 'honda cars ohio'],
        pagesCompleted: 3,
        blogsCompleted: 2,
        gbpPostsCompleted: 4,
        improvementsCompleted: 1,
        completedTasks: [
          {
            type: 'page',
            title: 'Honda Accord Inventory Page - Columbus',
            url: 'https://example.com/inventory/accord',
            publishedDate: new Date().toISOString()
          },
          {
            type: 'page', 
            title: 'Honda Service Center - Dublin Location',
            url: 'https://example.com/service/dublin',
            publishedDate: new Date().toISOString()
          },
          {
            type: 'blog',
            title: '2024 Honda CR-V Review: Perfect for Ohio Families',
            url: 'https://example.com/blog/crv-review-2024',
            publishedDate: new Date().toISOString()
          },
          {
            type: 'gbp_post',
            title: 'New Year Special: 0% APR on Select Models',
            url: 'https://example.com/specials/new-year',
            publishedDate: new Date().toISOString()
          },
          {
            type: 'gbp_post',
            title: 'Winter Service Tips for Your Honda',
            url: 'https://example.com/service/winter-tips',
            publishedDate: new Date().toISOString()
          },
          {
            type: 'improvement',
            title: 'Homepage SEO Optimization - Title Tags & Meta Descriptions',
            url: 'https://example.com',
            publishedDate: new Date().toISOString()
          }
        ]
      }
    });

    console.log('✅ Sample request created successfully!');
    console.log(`   Request ID: ${sampleRequest.id}`);
    console.log(`   Title: ${sampleRequest.title}`);
    console.log(`   Completed Tasks: ${sampleRequest.completedTasks.length}`);
    console.log('');
    console.log('🎉 Now refresh the requests page to see the enhanced UI in action!');
    console.log('   You should see:');
    console.log('   • Enhanced card with blue "View Work" buttons');
    console.log('   • Color-coded progress bars');
    console.log('   • Individual task cards with icons');
    console.log('   • Better visual hierarchy and spacing');

  } catch (error) {
    console.error('❌ Error adding sample request:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
addSampleRequest().catch(console.error);