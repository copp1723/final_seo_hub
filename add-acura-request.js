#!/usr/bin/env node

/**
 * Add sample request data for Acura of Columbus to showcase the redesigned UI
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addAcuraRequest() {
  console.log('🚀 ADDING ACURA SAMPLE REQUEST FOR UI TESTING');
  console.log('=' .repeat(50));
  
  try {
    // Find Acura dealership specifically
    const dealership = await prisma.dealerships.findFirst({
      where: {
        OR: [
          { name: { contains: 'Acura', mode: 'insensitive' } },
          { clientId: 'dealer-acura-columbus' }
        ]
      }
    });
    
    if (!dealership) {
      console.log('❌ No Acura dealership found.');
      return;
    }

    console.log(`📍 Using dealership: ${dealership.name} (${dealership.clientId})`);

    // Find a user to associate with
    const user = await prisma.users.findFirst();
    if (!user) {
      console.log('❌ No user found.');
      return;
    }

    console.log(`👤 Using user: ${user.email}`);

    // Create sample request with completed tasks for Acura
    const sampleRequest = await prisma.requests.create({
      data: {
        id: `acura-request-${Date.now()}`,
        userId: user.id,
        dealershipId: dealership.id,
        agencyId: null,
        updatedAt: new Date(),
        title: `${dealership.name} - Monthly SEO Package`,
        description: 'Monthly SEO package with Acura-focused content and local optimization',
        type: 'seo_package',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        packageType: 'GOLD',
        targetCities: ['Columbus', 'Dublin', 'Westerville', 'Grove City'],
        targetModels: ['MDX', 'RDX', 'TLX', 'Integra', 'NSX'],
        keywords: ['acura dealer columbus', 'acura columbus ohio', 'acura mdx columbus'],
        pagesCompleted: 4,
        blogsCompleted: 3,
        gbpPostsCompleted: 5,
        improvementsCompleted: 2,
        completedTasks: [
          {
            type: 'page',
            title: 'New 2024 Acura MDX Inventory - Columbus',
            url: 'https://acuraofcolumbus.com/new-inventory/mdx',
            publishedDate: new Date().toISOString()
          },
          {
            type: 'page', 
            title: 'Acura Service Center - Certified Technicians',
            url: 'https://acuraofcolumbus.com/service-center',
            publishedDate: new Date().toISOString()
          },
          {
            type: 'page',
            title: 'Acura TLX vs Competition - Columbus Market',
            url: 'https://acuraofcolumbus.com/tlx-comparison',
            publishedDate: new Date().toISOString()
          },
          {
            type: 'blog',
            title: '2024 Acura RDX: Perfect SUV for Ohio Families',
            url: 'https://acuraofcolumbus.com/blog/2024-rdx-ohio-families',
            publishedDate: new Date().toISOString()
          },
          {
            type: 'blog',
            title: 'Top 5 Acura Safety Features for Columbus Drivers',
            url: 'https://acuraofcolumbus.com/blog/acura-safety-features',
            publishedDate: new Date().toISOString()
          },
          {
            type: 'gbp_post',
            title: '🎉 New Year Sale: 1.9% APR on Select Acura Models',
            url: 'https://acuraofcolumbus.com/specials/new-year-2024',
            publishedDate: new Date().toISOString()
          },
          {
            type: 'gbp_post',
            title: '⚡ Just Arrived: 2024 Acura Integra Type S',
            url: 'https://acuraofcolumbus.com/new-models/integra-type-s',
            publishedDate: new Date().toISOString()
          },
          {
            type: 'improvement',
            title: 'Homepage SEO: Enhanced Title Tags & Local Schema',
            url: 'https://acuraofcolumbus.com',
            publishedDate: new Date().toISOString()
          }
        ]
      }
    });

    console.log('✅ Acura sample request created successfully!');
    console.log(`   Request ID: ${sampleRequest.id}`);
    console.log(`   Title: ${sampleRequest.title}`);
    console.log(`   Dealership: ${dealership.name}`);
    console.log(`   Completed Tasks: ${sampleRequest.completedTasks.length}`);
    console.log('');
    console.log('🎉 Now refresh the requests page to see the enhanced UI!');
    console.log('   Make sure "Acura of Columbus" is selected in the dealership filter.');

  } catch (error) {
    console.error('❌ Error adding Acura request:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
addAcuraRequest().catch(console.error);