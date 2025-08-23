#!/usr/bin/env node

/**
 * Add sample request using existing user
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addSimpleRequest() {
  console.log('🚀 ADDING SIMPLE REQUEST WITH EXISTING USER');
  console.log('=' .repeat(50));
  
  try {
    // Find existing user and dealership
    const user = await prisma.users.findFirst();
    const dealership = await prisma.dealerships.findFirst({
      where: { clientId: 'dealer-acura-columbus' }
    });
    
    if (!user) {
      console.log('❌ No user found');
      return;
    }
    
    if (!dealership) {
      console.log('❌ No dealership found');
      return;
    }

    console.log(`👤 Using user: ${user.email} (${user.id})`);
    console.log(`📍 Using dealership: ${dealership.name}`);

    // Delete any existing sample requests first
    await prisma.requests.deleteMany({
      where: { 
        title: { contains: 'Monthly SEO Package' }
      }
    });

    // Create simple request
    const sampleRequest = await prisma.requests.create({
      data: {
        id: `demo-request-${Date.now()}`,
        userId: user.id,
        dealershipId: dealership.id,
        agencyId: null,
        updatedAt: new Date(),
        title: `${dealership.name} - Monthly SEO Package`,
        description: 'Monthly SEO package with pages, blogs, and GBP posts',
        type: 'seo_package',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        packageType: 'GOLD',
        targetCities: ['Columbus', 'Dublin', 'Westerville'],
        targetModels: ['MDX', 'RDX', 'TLX'],
        keywords: ['acura dealer columbus'],
        pagesCompleted: 3,
        blogsCompleted: 2,
        gbpPostsCompleted: 4,
        improvementsCompleted: 1,
        completedTasks: [
          {
            type: 'page',
            title: '2024 Acura MDX Inventory Page',
            url: 'https://example.com/inventory/mdx',
            publishedDate: new Date().toISOString()
          },
          {
            type: 'blog',
            title: 'Acura RDX Review for Ohio Families',
            url: 'https://example.com/blog/rdx-review',
            publishedDate: new Date().toISOString()
          },
          {
            type: 'gbp_post',
            title: 'New Year Special Offers',
            url: 'https://example.com/specials',
            publishedDate: new Date().toISOString()
          }
        ]
      }
    });

    console.log('✅ Request created successfully!');
    console.log(`   Request ID: ${sampleRequest.id}`);
    console.log(`   Title: ${sampleRequest.title}`);
    console.log('');
    console.log('🎉 The request was created but may not show due to user filtering.');
    console.log('   Try switching to "All Dealerships" or check if there are user permissions.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addSimpleRequest().catch(console.error);