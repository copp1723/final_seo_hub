import { contentAddedTemplate } from './lib/mailgun/content-notifications.js'
import { requests, users } from '@prisma/client'
import { writeFileSync } from 'fs'
import { join } from 'path'

// Create sample data
const sampleUser: users = {
  id: 'user_demo',
  email: 'john@exampledealership.com',
  name: 'John Smith',
  emailVerified: new Date(),
  image: null,
  role: 'USER',
  agencyId: 'agency_123',
  dealershipId: 'dealership_123',
  apiKey: null,
  apiKeyCreatedAt: null,
  onboardingCompleted: true,
  invitationToken: null,
  invitationTokenExpires: null,
  createdAt: new Date(),
  updatedAt: new Date()
}

const sampleRequest: requests = {
  id: 'req_demo',
  userId: 'user_demo',
  agencyId: 'agency_123',
  dealershipId: 'dealership_123',
  title: 'Monthly SEO Content Package',
  description: 'Gold package SEO content for January 2024',
  type: 'page',
  priority: 'MEDIUM',
  status: 'IN_PROGRESS',
  packageType: 'GOLD',
  seoworksTaskId: 'seo_demo',
  pagesCompleted: 2,
  blogsCompleted: 4,
  gbpPostsCompleted: 8,
  improvementsCompleted: 1,
  keywords: null,
  targetUrl: null,
  targetCities: null,
  targetModels: null,
  completedTasks: [],
  contentUrl: null,
  pageTitle: null,
  completedAt: null,
  createdAt: new Date(),
  updatedAt: new Date()
}

// Generate previews for different content types
const scenarios = [
  {
    name: 'page-notification',
    taskDetails: {
      title: '2024 Toyota Camry Deals in Chicago - Best Prices',
      type: 'page',
      url: 'https://exampledealership.com/2024-toyota-camry-chicago'
    }
  },
  {
    name: 'blog-notification',
    taskDetails: {
      title: 'Winter Car Maintenance Tips: Keep Your Vehicle Running Smoothly',
      type: 'blog',
      url: 'https://exampledealership.com/blog/winter-car-maintenance-tips'
    }
  },
  {
    name: 'gbp-notification',
    taskDetails: {
      title: '🎄 Holiday Special: 0% APR Financing on All 2024 Models!',
      type: 'gbp-post',
      url: 'https://posts.gle/abc123xyz'
    }
  },
  {
    name: 'improvement-notification',
    taskDetails: {
      title: 'Homepage Speed Optimization & Mobile Experience Enhancement',
      type: 'improvement',
      url: 'https://exampledealership.com'
    }
  },
  {
    name: 'no-url-notification',
    taskDetails: {
      title: 'Backend SEO Schema Markup Implementation',
      type: 'improvement',
      url: undefined
    }
  }
]

// Generate HTML files for each scenario
scenarios.forEach(scenario => {
  const result = contentAddedTemplate(sampleRequest, sampleUser, scenario.taskDetails)
  const outputPath = join(__dirname, '.', 'email-previews', `${scenario.name}.html`)
  
  // Wrap in a full HTML document for better preview
  const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Email Preview: ${scenario.name}</title>
  <style>
    body { 
      margin: 0; 
      padding: 20px; 
      background: #f5f5f5; 
      font-family: Arial, sans-serif;
    }
   .subject-line {
      background: #333;
      color: white;
      padding: 15px;
      margin-bottom: 20px;
      font-size: 16px;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="subject-line">Subject: ${result.subject}</div>
  ${result.html}
</body>
</html>
  `
  
  writeFileSync(outputPath, fullHtml)
  console.log(`✓ Generated preview: ${scenario.name}.html`)
})

console.log('\nAll email previews generated in./email-previews/')
