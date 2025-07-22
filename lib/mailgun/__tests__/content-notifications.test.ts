import { contentAddedTemplate } from '../content-notifications'
import { requests, users } from '@prisma/client'

describe('contentAddedTemplate', () => {
  const mockUser: users = {
    id: 'user_123',
    email: 'john@dealership.com',
    name: 'John Doe',
    emailVerified: new Date(),
    image: null,
    role: 'USER',
    agencyId: 'agency_123',
    apiKey: null,
    apiKeyCreatedAt: null,
    onboardingCompleted: true,
    activePackageType: 'GOLD',
    currentBillingPeriodStart: new Date(),
    currentBillingPeriodEnd: new Date(),
    pagesUsedThisPeriod: 2,
    blogsUsedThisPeriod: 4,
    gbpPostsUsedThisPeriod: 8,
    improvementsUsedThisPeriod: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const mockRequest: requests = {
    id: 'req_123',
    userId: 'user_123',
    agencyId: 'agency_123',
    title: 'Monthly SEO Content',
    description: 'SEO content for the month',
    type: 'page',
    priority: 'MEDIUM',
    status: 'IN_PROGRESS',
    packageType: 'GOLD',
    seoworksTaskId: 'seo_123',
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

  it('should generate correct template for a new page', () => {
    const taskDetails = {
      title: '2024 Toyota Camry Deals in Chicago',
      type: 'page',
      url: 'https://dealership.com/2024-toyota-camry-chicago'
    }

    const result = contentAddedTemplate(mockRequest, mockUser, taskDetails)

    expect(result.subject).toBe('✨ New Page Added: "2024 Toyota Camry Deals in Chicago"')
    expect(result.html).toContain('New Content added to Your Website!')
    expect(result.html).toContain('John Doe')
    expect(result.html).toContain('2024 Toyota Camry Deals in Chicago')
    expect(result.html).toContain('View Your New Content →')
    expect(result.html).toContain(taskDetails.url)
    expect(result.html).toContain('Pages Added: <strong>2</strong>')
    expect(result.html).toContain('Blog Posts Published: <strong>4</strong>')
  })

  it('should generate correct template for a blog post', () => {
    const taskDetails = {
      title: 'Winter Car Maintenance Tips',
      type: 'blog',
      url: 'https://dealership.com/blog/winter-car-maintenance'
    }

    const result = contentAddedTemplate(mockRequest, mockUser, taskDetails)

    expect(result.subject).toBe('✨ Blog Post Added: "Winter Car Maintenance Tips"')
    expect(result.html).toContain('Blog Post')
    expect(result.html).toContain('Winter Car Maintenance Tips')
  })

  it('should generate correct template for a GBP post', () => {
    const taskDetails = {
      title: 'Black Friday Special - 0% APR',
      type: 'gbp_post',
      url: 'https://posts.gle/abc123'
    }

    const result = contentAddedTemplate(mockRequest, mockUser, taskDetails)

    expect(result.subject).toBe('✨ Google Business Profile Post Added: "Black Friday Special - 0% APR"')
    expect(result.html).toContain('Google Business Profile Post')
    expect(result.html).toContain('Black Friday Special - 0% APR')
  })

  it('should handle missing URL gracefully', () => {
    const taskDetails = {
      title: 'New Content Without URL',
      type: 'page',
      url: undefined
    }

    const result = contentAddedTemplate(mockRequest, mockUser, taskDetails)

    expect(result.html).not.toContain('View Your New Content')
    expect(result.html).toContain('New Content Without URL')
  })

  it('should handle user without name', () => {
    const userWithoutName = { ...mockUser, name: null }
    const taskDetails = {
      title: 'Test Page',
      type: 'page',
      url: 'https://example.com'
    }

    const result = contentAddedTemplate(mockRequest, userWithoutName, taskDetails)

    expect(result.html).toContain('Hi there,')
  })

  it('should not show progress for requests without package type', () => {
    const requestWithoutPackage = { ...mockRequest, packageType: null }
    const taskDetails = {
      title: 'Test Page',
      type: 'page',
      url: 'https://example.com'
    }

    const result = contentAddedTemplate(requestWithoutPackage, mockUser, taskDetails)

    expect(result.html).not.toContain('Your SEO Progress This Month')
    expect(result.html).not.toContain('Pages Added:')
  })

  it('should use "updated on" for improvements and maintenance', () => {
    const taskDetails = {
      title: 'Homepage Speed Optimization',
      type: 'improvement',
      url: 'https://dealership.com'
    }

    const result = contentAddedTemplate(mockRequest, mockUser, taskDetails)

    expect(result.html).toContain('New Content updated on Your Website!')
    expect(result.html).toContain('Website Improvement')
  })
})
