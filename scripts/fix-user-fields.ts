import { prisma } from '../lib/prisma'
import { UserRole } from '@prisma/client'

async function fixUserFields() {
  console.log('Starting user fields fix...')
  
  try {
    // Find all users and check for missing fields
    const users = await prisma.user.findMany()
    
    console.log(`Checking ${users.length} users for missing fields`)
    
    let updatedCount = 0
    
    // Update each user with default values
    for (const user of users) {
      const updateData: any = {}
      
      if (!user.role) {
        updateData.role = UserRole.USER
      }
      if (user.onboardingCompleted === null || user.onboardingCompleted === undefined) {
        updateData.onboardingCompleted = false
      }
      if (user.pagesUsedThisPeriod === null || user.pagesUsedThisPeriod === undefined) {
        updateData.pagesUsedThisPeriod = 0
      }
      if (user.blogsUsedThisPeriod === null || user.blogsUsedThisPeriod === undefined) {
        updateData.blogsUsedThisPeriod = 0
      }
      if (user.gbpPostsUsedThisPeriod === null || user.gbpPostsUsedThisPeriod === undefined) {
        updateData.gbpPostsUsedThisPeriod = 0
      }
      if (user.improvementsUsedThisPeriod === null || user.improvementsUsedThisPeriod === undefined) {
        updateData.improvementsUsedThisPeriod = 0
      }
      
      if (Object.keys(updateData).length > 0) {
        await prisma.user.update({
          where: { id: user.id },
          data: updateData
        })
        console.log(`Updated user ${user.email} with:`, updateData)
        updatedCount++
      }
    }
    
    console.log(`User fields fix completed! Updated ${updatedCount} users.`)
  } catch (error) {
    console.error('Error fixing user fields:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
fixUserFields()