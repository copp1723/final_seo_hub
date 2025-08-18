const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function debugInvitationUrl() {
  try {
    console.log('🔍 Debugging invitation URL issue...')
    
    // Check environment variables
    console.log('\n📊 Environment Variables:')
    console.log(`NODE_ENV: ${process.env.NODE_ENV}`)
    console.log(`NEXTAUTH_URL: ${process.env.NEXTAUTH_URL}`)
    console.log(`NEXT_PUBLIC_APP_URL: ${process.env.NEXT_PUBLIC_APP_URL}`)
    
    // Check the user and token
    const user = await prisma.users.findUnique({
      where: { email: 'seo-access@onekeel.ai' }
    })
    
    if (!user) {
      console.log('❌ User not found')
      return
    }
    
    console.log('\n👤 User Details:')
    console.log(`Email: ${user.email}`)
    console.log(`ID: ${user.id}`)
    console.log(`Role: ${user.role}`)
    console.log(`Agency ID: ${user.agencyId}`)
    console.log(`Has Token: ${!!user.invitationToken}`)
    console.log(`Token Expires: ${user.invitationTokenExpires}`)
    console.log(`Token Valid: ${user.invitationTokenExpires && user.invitationTokenExpires > new Date()}`)
    
    if (user.invitationToken) {
      console.log('\n🔗 URL Construction:')
      const baseUrl1 = process.env.NEXTAUTH_URL || 'https://rylie-seo-hub.onrender.com'
      const baseUrl2 = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      
      console.log(`Base URL (method 1): ${baseUrl1}`)
      console.log(`Base URL (method 2): ${baseUrl2}`)
      console.log(`Current token: ${user.invitationToken}`)
      
      const invitationUrl1 = `${baseUrl1}/api/invitation?token=${user.invitationToken}`
      const invitationUrl2 = `${baseUrl2}/api/invitation?token=${user.invitationToken}`
      
      console.log(`\nInvitation URL (method 1): ${invitationUrl1}`)
      console.log(`Invitation URL (method 2): ${invitationUrl2}`)
    }
    
    // Test if we can create a simple fetch request to our own API
    console.log('\n🧪 Testing API Response:')
    try {
      const response = await fetch(`https://rylie-seo-hub.onrender.com/api/invitation?token=${user.invitationToken}`)
      console.log(`Response status: ${response.status}`)
      console.log(`Response redirected: ${response.redirected}`)
      console.log(`Response URL: ${response.url}`)
      
      // Check headers
      console.log('Response headers:')
      for (const [key, value] of response.headers.entries()) {
        if (key.toLowerCase().includes('location') || key.toLowerCase().includes('redirect')) {
          console.log(`  ${key}: ${value}`)
        }
      }
    } catch (fetchError) {
      console.log(`Fetch error: ${fetchError.message}`)
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugInvitationUrl()