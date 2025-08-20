#!/usr/bin/env node

/**
 * Add sample request data for the actual logged-in user
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addRequestForJosh() {
  console.log('🚀 ADDING REQUEST FOR ACTUAL USER');
  console.log('=' .repeat(50));
  
  try {
    // Use the actual logged-in user ID from the logs
    const actualUserId = 'f0f77fa5-e611-47f0-807a-134b54b99bad';
    
    // Find Acura dealership
    const dealership = await prisma.dealerships.findFirst({
      where: { clientId: 'dealer-acura-columbus' }
    });
    
    if (!dealership) {
      console.log('❌ No Acura dealership found.');
      return;
    }

    console.log(`📍 Using dealership: ${dealership.name} (${dealership.id})`);
    console.log(`👤 Using actual user ID: ${actualUserId}`);

    // Create sample request with the correct user ID
    const sampleRequest = await prisma.requests.create({
      data: {
        id: `josh-request-${Date.now()}`,
        userId: actualUserId, // Use actual logged-in user
        dealershipId: dealership.id,
        agencyId: null,
        updatedAt: new Date(),
        title: `${dealership.name} - Monthly SEO Package`,
        description: 'Monthly SEO package with Acura-focused content',
        type: 'seo_package',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        packageType: 'GOLD',
        targetCities: ['Columbus', 'Dublin', 'Westerville'],
        targetModels: ['MDX', 'RDX', 'TLX', 'Integra'],
        keywords: ['acura dealer columbus', 'acura columbus ohio'],
        pagesCompleted: 4,
        blogsCompleted: 3,
        gbpPostsCompleted: 5,
        improvementsCompleted: 2,
        completedTasks: [
          {
            type: 'page',
            title: '2024 Acura MDX Inventory - Columbus',
            url: 'https://acuraofcolumbus.com/new-inventory/mdx',
            publishedDate: new Date().toISOString()
          },
          {
            type: 'blog',
            title: '2024 Acura RDX: Perfect SUV for Ohio Families',
            url: 'https://acuraofcolumbus.com/blog/2024-rdx-ohio-families',
            publishedDate: new Date().toISOString()
          },
          {
            type: 'gbp_post',
            title: '🎉 New Year Sale: 1.9% APR on Select Models',
            url: 'https://acuraofcolumbus.com/specials/new-year',
            publishedDate: new Date().toISOString()
          },
          {
            type: 'improvement',
            title: 'Homepage SEO: Enhanced Title Tags & Schema',
            url: 'https://acuraofcolumbus.com',
            publishedDate: new Date().toISOString()
          }
        ]
      }
    });

    console.log('✅ Request created successfully for actual user!');
    console.log(`   Request ID: ${sampleRequest.id}`);
    console.log(`   User ID: ${actualUserId}`);
    console.log(`   Dealership: ${dealership.name}`);
    console.log('');
    console.log('🎉 Now refresh the requests page - it should show up!');

  } catch (error) {
    console.error('❌ Error adding request:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
addRequestForJosh().catch(console.error);