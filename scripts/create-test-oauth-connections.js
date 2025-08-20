const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')

// Simple encryption function for test tokens
function encryptTestToken(text) {
  const algorithm = 'aes-256-gcm'
  const secretKey = process.env.ENCRYPTION_KEY
  
  if (!secretKey) {
    throw new Error('ENCRYPTION_KEY environment variable is required')
  }
  
  const key = crypto.createHash('sha256').update(secretKey).digest()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(algorithm, key, iv)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const authTag = cipher.getAuthTag()
  
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted
}

const prisma = new PrismaClient()

async function createTestOAuthConnections() {
  try {
    // Get user and dealership info
    const user = await prisma.users.findUnique({
      where: { email: 'josh.copp@onekeel.ai' }
    })
    
    if (!user) {
      console.error('User josh.copp@onekeel.ai not found')
      return
    }
    
    console.log('Found user:', { id: user.id, email: user.email, role: user.role })
    
    // Get a few test dealerships from SEOWORKS agency
    const seoworksAgency = await prisma.agencies.findFirst({
      where: { name: 'SEOWORKS' }
    })
    
    if (!seoworksAgency) {
      console.error('SEOWORKS agency not found')
      return
    }
    
    const testDealerships = await prisma.dealerships.findMany({
      where: { agencyId: seoworksAgency.id },
      take: 3,
      select: { id: true, name: true, clientId: true }
    })
    
    console.log('Test dealerships:', testDealerships.map(d => `${d.name} (${d.id})`))
    
    // Create test credentials (these are fake tokens that won't work for real API calls)
    const testAccessToken = 'test_access_token_' + Date.now()
    const testRefreshToken = 'test_refresh_token_' + Date.now()
    
    // Encrypt the test tokens
    const encryptedAccessToken = encryptTestToken(testAccessToken)
    const encryptedRefreshToken = encryptTestToken(testRefreshToken)
    
    // Create GA4 connections for each test dealership
    for (const dealership of testDealerships) {
      console.log(`Creating GA4 connection for ${dealership.name}...`)
      
      const ga4Connection = await prisma.ga4_connections.upsert({
        where: {
          userId_dealershipId: {
            userId: user.id,
            dealershipId: dealership.id
          }
        },
        update: {
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
          propertyId: '320759942', // Test property ID
          propertyName: `${dealership.name} - GA4 Property`,
          email: user.email,
          updatedAt: new Date()
        },
        create: {
          userId: user.id,
          dealershipId: dealership.id,
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          expiresAt: new Date(Date.now() + 3600000),
          propertyId: '320759942',
          propertyName: `${dealership.name} - GA4 Property`,
          email: user.email
        }
      })
      
      console.log(`✅ Created GA4 connection ${ga4Connection.id}`)
      
      // Create Search Console connection
      console.log(`Creating Search Console connection for ${dealership.name}...`)
      
      const scConnection = await prisma.search_console_connections.upsert({
        where: {
          userId_dealershipId: {
            userId: user.id,
            dealershipId: dealership.id
          }
        },
        update: {
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          expiresAt: new Date(Date.now() + 3600000),
          siteUrl: `https://www.${dealership.name.toLowerCase().replace(/\s+/g, '')}.com/`,
          siteName: dealership.name,
          email: user.email,
          updatedAt: new Date()
        },
        create: {
          userId: user.id,
          dealershipId: dealership.id,
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          expiresAt: new Date(Date.now() + 3600000),
          siteUrl: `https://www.${dealership.name.toLowerCase().replace(/\s+/g, '')}.com/`,
          siteName: dealership.name,
          email: user.email
        }
      })
      
      console.log(`✅ Created Search Console connection ${scConnection.id}`)
    }
    
    // Create a user-level connection as well (no dealership specified)
    console.log('Creating user-level GA4 connection...')
    const userGA4 = await prisma.ga4_connections.upsert({
      where: {
        userId_dealershipId: {
          userId: user.id,
          dealershipId: null
        }
      },
      update: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: new Date(Date.now() + 3600000),
        propertyId: '320759942',
        propertyName: 'Default GA4 Property',
        email: user.email,
        updatedAt: new Date()
      },
      create: {
        userId: user.id,
        dealershipId: null,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: new Date(Date.now() + 3600000),
        propertyId: '320759942',
        propertyName: 'Default GA4 Property',
        email: user.email
      }
    })
    
    console.log(`✅ Created user-level GA4 connection ${userGA4.id}`)
    
    console.log('Creating user-level Search Console connection...')
    const userSC = await prisma.search_console_connections.upsert({
      where: {
        userId_dealershipId: {
          userId: user.id,
          dealershipId: null
        }
      },
      update: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: new Date(Date.now() + 3600000),
        siteUrl: 'https://www.example.com/',
        siteName: 'Default Site',
        email: user.email,
        updatedAt: new Date()
      },
      create: {
        userId: user.id,
        dealershipId: null,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: new Date(Date.now() + 3600000),
        siteUrl: 'https://www.example.com/',
        siteName: 'Default Site',
        email: user.email
      }
    })
    
    console.log(`✅ Created user-level Search Console connection ${userSC.id}`)
    
    // Verify connections were created
    const ga4Count = await prisma.ga4_connections.count()
    const scCount = await prisma.search_console_connections.count()
    
    console.log('\n🎉 SUCCESS: OAuth connections created!')
    console.log(`📊 Total GA4 connections: ${ga4Count}`)
    console.log(`🔍 Total Search Console connections: ${scCount}`)
    
    // Show connection details
    const connections = await prisma.ga4_connections.findMany({
      where: { userId: user.id },
      include: { dealerships: { select: { name: true } } }
    })
    
    console.log('\n📋 GA4 Connections Summary:')
    connections.forEach(conn => {
      console.log(`  - ${conn.dealerships?.name || 'User-level'}: ${conn.propertyName} (Property: ${conn.propertyId})`)
    })
    
  } catch (error) {
    console.error('Error creating test OAuth connections:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTestOAuthConnections()