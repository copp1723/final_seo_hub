import { PrismaClient, RequestStatus, RequestPriority, PackageType } from '@prisma/client'

const prisma = new PrismaClient()

async function createTestRequestsForJeff() {
  try {
    // Find a test user or create one
    let testUser = await prisma.user.findFirst({
      where: { email: 'manager@jayhatfieldchevrolet.com' }
    })

    if (!testUser) {
      testUser = await prisma.user.create({
        data: {
          email: 'manager@jayhatfieldchevrolet.com',
          name: 'Jay Hatfield Test User',
          role: 'USER',
          onboardingCompleted: true,
          activePackageType: PackageType.GOLD,
        }
      })
      console.log('Created test user:', testUser.id)
    }

    // Jeff's task IDs from the logs
    const taskIds = {
      pages: ['task-p-70906', 'task-p-70907', 'task-p-70908'],
      blogs: ['task-b-63450', 'task-b-63451', 'task-b-63452'],
      gbpPosts: ['task-g-137975', 'task-g-137976', 'task-g-137977', 'task-g-137978', 
                 'task-g-137979', 'task-g-137980', 'task-g-137981', 'task-g-137982']
    }

    // Create requests for each task ID
    const requests = []

    // Create page requests
    for (const taskId of taskIds.pages) {
      const request = await prisma.request.create({
        data: {
          id: taskId, // Use Jeff's task ID as our request ID
          userId: testUser.id,
          title: `Test Page Request - ${taskId}`,
          description: 'Test request for SEOWorks webhook integration',
          type: 'page',
          status: RequestStatus.IN_PROGRESS,
          priority: RequestPriority.MEDIUM,
          packageType: PackageType.GOLD,
          targetCities: ['Pittsburg', 'Joplin', 'Parsons'],
          targetModels: ['Chevrolet Silverado', 'Chevrolet Equinox'],
          keywords: ['chevrolet dealer', 'new cars pittsburg'],
        }
      })
      requests.push(request)
      console.log(`Created page request: ${request.id}`)
    }

    // Create blog requests
    for (const taskId of taskIds.blogs) {
      const request = await prisma.request.create({
        data: {
          id: taskId,
          userId: testUser.id,
          title: `Test Blog Request - ${taskId}`,
          description: 'Test request for SEOWorks webhook integration',
          type: 'blog',
          status: RequestStatus.IN_PROGRESS,
          priority: RequestPriority.MEDIUM,
          packageType: PackageType.GOLD,
          targetCities: ['Pittsburg', 'Joplin'],
          keywords: ['car maintenance', 'automotive tips'],
        }
      })
      requests.push(request)
      console.log(`Created blog request: ${request.id}`)
    }

    // Create GBP post requests
    for (const taskId of taskIds.gbpPosts) {
      const request = await prisma.request.create({
        data: {
          id: taskId,
          userId: testUser.id,
          title: `Test GBP Post Request - ${taskId}`,
          description: 'Test request for SEOWorks webhook integration',
          type: 'gbp_post',
          status: RequestStatus.IN_PROGRESS,
          priority: RequestPriority.MEDIUM,
          packageType: PackageType.GOLD,
          targetCities: ['Pittsburg'],
        }
      })
      requests.push(request)
      console.log(`Created GBP post request: ${request.id}`)
    }

    console.log(`\nSuccessfully created ${requests.length} test requests`)
    console.log('\nJeff can now resend his webhooks and they will match these requests!')

  } catch (error) {
    console.error('Error creating test requests:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
createTestRequestsForJeff() 