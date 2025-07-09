import { contentAddedTemplate } from '../lib/mailgun/content-notifications'
import { Request, User } from '@prisma/client'

describe('Content Notifications Edge Cases', () => {
  const baseUser: User = {
    id: 'user_123',
    email: 'test@dealership.com',
    name: 'Test User',
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
    pagesUsedThisPeriod: 0,
    blogsUsedThisPeriod: 0,
    gbpPostsUsedThisPeriod: 0,
    improvementsUsedThisPeriod: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  }

  const baseRequest: Request = {
    id: 'req_123',
    userId: 'user_123',
    agencyId: 'agency_123',
    title: 'Test Request',
    description: 'Test description',
    type: 'page',
    priority: 'MEDIUM',
    status: 'IN_PROGRESS',
    packageType: null,
    seoworksTaskId: 'seo_123',
    pagesCompleted: 0,
    blogsCompleted: 0,
    gbpPostsCompleted: 0,
    improvementsCompleted: 0,
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

  describe('Special Characters and Edge Cases', () => {
    it('should handle titles with special characters', () => {
      const taskDetails = {
        title: 'Best Deals & Offers! <script>alert("test")</script> $100 OFF',
        type: 'page',
        url: 'https://dealership.com/special-offers'
      }

      const result = contentAddedTemplate(baseRequest, baseUser, taskDetails)

      expect(result.subject).toBe('✨ New Page Added: "Best Deals & Offers! <script>alert("test")</script> $100 OFF"')
      expect(result.html).toContain('Best Deals &amp; Offers! &lt;script&gt;alert(&quot;test&quot;)&lt;/script&gt; $100 OFF')
    })

    it('should handle very long titles', () => {
      const longTitle = 'A'.repeat(300)
      const taskDetails = {
        title: longTitle,
        type: 'blog',
        url: 'https://dealership.com/blog/long-post'
      }

      const result = contentAddedTemplate(baseRequest, baseUser, taskDetails)

      expect(result.subject).toContain('Blog Post Added:')
      expect(result.html).toContain(longTitle)
    })

    it('should handle empty title', () => {
      const taskDetails = {
        title: '',
        type: 'page',
        url: 'https://dealership.com/page'
      }

      const result = contentAddedTemplate(baseRequest, baseUser, taskDetails)

      expect(result.subject).toBe('✨ New Page Added: ""')
      expect(result.html).toContain('New Page')
    })

    it('should handle null/undefined fields gracefully', () => {
      const userWithNulls = {
        ...baseUser,
        name: null,
        agencyId: null
      }

      const requestWithNulls = {
        ...baseRequest,
        packageType: null,
        pagesCompleted: 0,
        blogsCompleted: 0,
        gbpPostsCompleted: 0,
        improvementsCompleted: 0
      }

      const taskDetails = {
        title: 'Test Page',
        type: 'page',
        url: undefined
      }

      const result = contentAddedTemplate(requestWithNulls, userWithNulls, taskDetails)

      expect(result.html).toContain('Hi there,')
      expect(result.html).not.toContain('Your SEO Progress This Month')
      expect(result.html).not.toContain('View Your New Content')
    })
  })

  describe('Content Type Variations', () => {
    it('should handle gbp_post with underscore', () => {
      const taskDetails = {
        title: 'Holiday Special',
        type: 'gbp_post',
        url: 'https://posts.gle/abc'
      }

      const result = contentAddedTemplate(baseRequest, baseUser, taskDetails)

      expect(result.subject).toBe('✨ Google Business Profile Post Added: "Holiday Special"')
      expect(result.html).toContain('Google Business Profile Post')
    })

    it('should handle gbp-post with hyphen', () => {
      const taskDetails = {
        title: 'Summer Sale',
        type: 'gbp-post',
        url: 'https://posts.gle/xyz'
      }

      const result = contentAddedTemplate(baseRequest, baseUser, taskDetails)

      expect(result.subject).toBe('✨ Google Business Profile Post Added: "Summer Sale"')
      expect(result.html).toContain('Google Business Profile Post')
    })

    it('should handle unknown content type', () => {
      const taskDetails = {
        title: 'Unknown Content',
        type: 'unknown_type',
        url: 'https://dealership.com/unknown'
      }

      const result = contentAddedTemplate(baseRequest, baseUser, taskDetails)

      expect(result.subject).toBe('✨ Content Added: "Unknown Content"')
      expect(result.html).toContain('Content')
    })
  })

  describe('Progress Display Logic', () => {
    it('should only show non-zero progress items', () => {
      const request = {
        ...baseRequest,
        packageType: 'GOLD',
        pagesCompleted: 0,
        blogsCompleted: 3,
        gbpPostsCompleted: 0,
        improvementsCompleted: 1
      }

      const taskDetails = {
        title: 'New Blog Post',
        type: 'blog',
        url: 'https://dealership.com/blog/new'
      }

      const result = contentAddedTemplate(request, baseUser, taskDetails)

      expect(result.html).not.toContain('Pages Added:')
      expect(result.html).toContain('Blog Posts Published: <strong>3</strong>')
      expect(result.html).not.toContain('Google Business Posts:')
      expect(result.html).toContain('Site Improvements: <strong>1</strong>')
    })

    it('should show all progress items when all have values', () => {
      const request = {
        ...baseRequest,
        packageType: 'PLATINUM',
        pagesCompleted: 4,
        blogsCompleted: 8,
        gbpPostsCompleted: 16,
        improvementsCompleted: 2
      }

      const taskDetails = {
        title: 'New Page',
        type: 'page',
        url: 'https://dealership.com/new-page'
      }

      const result = contentAddedTemplate(request, baseUser, taskDetails)

      expect(result.html).toContain('Pages Added: <strong>4</strong>')
      expect(result.html).toContain('Blog Posts Published: <strong>8</strong>')
      expect(result.html).toContain('Google Business Posts: <strong>16</strong>')
      expect(result.html).toContain('Site Improvements: <strong>2</strong>')
    })
  })

  describe('URL Handling', () => {
    it('should handle malformed URLs', () => {
      const taskDetails = {
        title: 'Test Page',
        type: 'page',
        url: 'not-a-valid-url'
      }

      const result = contentAddedTemplate(baseRequest, baseUser, taskDetails)

      expect(result.html).toContain('href="not-a-valid-url"')
      expect(result.html).toContain('View Your New Content')
    })

    it('should handle extremely long URLs', () => {
      const longUrl = 'https://dealership.com/' + 'a'.repeat(1000)
      const taskDetails = {
        title: 'Test Page',
        type: 'page',
        url: longUrl
      }

      const result = contentAddedTemplate(baseRequest, baseUser, taskDetails)

      expect(result.html).toContain(`href="${longUrl}"`)
    })
  })

  describe('Branding Configuration', () => {
    it('should use custom branding when provided', () => {
      const customBranding = {
        primaryColor: '#FF0000',
        secondaryColor: '#00FF00',
        companyName: 'Custom SEO Company',
        logo: 'https://custom.com/logo.png'
      }

      const taskDetails = {
        title: 'Branded Page',
        type: 'page',
        url: 'https://dealership.com/branded'
      }

      const result = contentAddedTemplate(baseRequest, baseUser, taskDetails, customBranding)

      expect(result.html).toContain('background-color: #FF0000')
      expect(result.html).toContain('Custom SEO Company')
    })
  })

  describe('Action Verb Logic', () => {
    it('should use "updated on" for improvements', () => {
      const taskDetails = {
        title: 'Speed Optimization',
        type: 'improvement',
        url: 'https://dealership.com'
      }

      const result = contentAddedTemplate(baseRequest, baseUser, taskDetails)

      expect(result.html).toContain('New Content updated on Your Website!')
      expect(result.html).toContain('Fresh content has been updated on your website')
    })

    it('should use "updated on" for maintenance', () => {
      const taskDetails = {
        title: 'Security Update',
        type: 'maintenance',
        url: 'https://dealership.com'
      }

      const result = contentAddedTemplate(baseRequest, baseUser, taskDetails)

      expect(result.html).toContain('New Content updated on Your Website!')
      expect(result.html).toContain('Website Update')
    })

    it('should use "added to" for content types', () => {
      const contentTypes = ['page', 'blog', 'gbp_post', 'gbp-post']
      
      contentTypes.forEach(type => {
        const taskDetails = {
          title: `Test ${type}`,
          type,
          url: 'https://dealership.com/test'
        }

        const result = contentAddedTemplate(baseRequest, baseUser, taskDetails)

        expect(result.html).toContain('New Content added to Your Website!')
        expect(result.html).toContain('Fresh content has been added to your website')
      })
    })
  })
})