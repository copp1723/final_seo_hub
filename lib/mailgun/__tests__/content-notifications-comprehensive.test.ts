import { contentAddedTemplate } from '../content-notifications'
import { requests, users, PackageType } from '@prisma/client'
import { DEFAULT_BRANDING } from '../../branding/config'

describe('contentAddedTemplate - Comprehensive Testing', () => {
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

  describe('Content Type Variations', () => {
    const contentTypes = [
      { type: 'page', expectedDisplay: 'New Page', expectedVerb: 'added to' },
      { type: 'blog', expectedDisplay: 'Blog Post', expectedVerb: 'added to' },
      { type: 'gbp_post', expectedDisplay: 'Google Business Profile Post', expectedVerb: 'added to' },
      { type: 'gbp-post', expectedDisplay: 'Google Business Profile Post', expectedVerb: 'added to' },
      { type: 'improvement', expectedDisplay: 'Website Improvement', expectedVerb: 'updated on' },
      { type: 'maintenance', expectedDisplay: 'Website Update', expectedVerb: 'updated on' },
      { type: 'unknown_type', expectedDisplay: 'Content', expectedVerb: 'added to' }
    ]

    contentTypes.forEach(({ type, expectedDisplay, expectedVerb }) => {
      it(`should handle ${type} content type correctly`, () => {
        const taskDetails = {
          title: `Test ${type} Content`,
          type,
          url: 'https://example.com/test'
        }

        const result = contentAddedTemplate(mockRequest, mockUser, taskDetails)

        expect(result.subject).toBe(`✨ ${expectedDisplay} Added: "Test ${type} Content"`)
        expect(result.html).toContain(`New Content ${expectedVerb} Your Website!`)
        expect(result.html).toContain(expectedDisplay)
      })
    })
  })

  describe('Special Characters and HTML Escaping', () => {
    it('should handle special characters in title', () => {
      const taskDetails = {
        title: 'Test with "quotes" & <tags> and \'apostrophes\'',
        type: 'page',
        url: 'https://example.com/test'
      }

      const result = contentAddedTemplate(mockRequest, mockUser, taskDetails)

      expect(result.html).toContain('Test with &quot;quotes&quot; &amp; &lt;tags&gt; and &#39;apostrophes&#39;')
      expect(result.subject).toContain('Test with "quotes" & <tags> and \'apostrophes\'')
    })

    it('should handle emoji and unicode characters', () => {
      const taskDetails = {
        title: '🚗 2024 Toyota Camry Deals - Best Prices! 💰',
        type: 'page',
        url: 'https://example.com/deals'
      }

      const result = contentAddedTemplate(mockRequest, mockUser, taskDetails)

      expect(result.html).toContain('🚗 2024 Toyota Camry Deals - Best Prices! 💰')
      expect(result.subject).toContain('🚗 2024 Toyota Camry Deals - Best Prices! 💰')
    })

    it('should handle very long titles', () => {
      const longTitle = 'A'.repeat(500)
      const taskDetails = {
        title: longTitle,
        type: 'page',
        url: 'https://example.com/test'
      }

      const result = contentAddedTemplate(mockRequest, mockUser, taskDetails)

      expect(result.html).toContain(longTitle)
      expect(result.subject.length).toBeGreaterThan(500)
    })
  })

  describe('URL Variations', () => {
    it('should handle different URL formats', () => {
      const urlFormats = [
        'https://dealership.com/page',
        'http://dealership.com/page',
        'https://subdomain.dealerships.com/long/path/to/page?param=value#section',
        'https://dealership.com/page-with-dashes_and_underscores',
        'https://posts.gle/abc123def456'
      ]

      urlFormats.forEach(url => {
        const taskDetails = {
          title: 'Test Page',
          type: 'page',
          url
        }

        const result = contentAddedTemplate(mockRequest, mockUser, taskDetails)
        expect(result.html).toContain(`href="${url}"`)
        expect(result.html).toContain('View Your New Content →')
      })
    })

    it('should handle malformed URLs gracefully', () => {
      const malformedUrls = [
        'not-a-url',
        'javascript:alert("xss")',
        'data:text/html,<script>alert("xss")</script>',
        ''
      ]

      malformedUrls.forEach(url => {
        const taskDetails = {
          title: 'Test Page',
          type: 'page',
          url
        }

        const result = contentAddedTemplate(mockRequest, mockUser, taskDetails)
        // Should still include the URL but not break the template
        expect(result.html).toContain('Test Page')
        expect(() => result.html).not.toThrow()
      })
    })
  })

  describe('User Name Variations', () => {
    const nameVariations = [
      { name: 'John Doe', expected: 'Hi John Doe,' },
      { name: 'John', expected: 'Hi John,' },
      { name: 'Dr.John Doe Jr.', expected: 'Hi Dr.John Doe Jr,' },
      { name: 'José María García-López', expected: 'Hi José María García-López,' },
      { name: '李小明', expected: 'Hi 李小明,' },
      { name: null, expected: 'Hi there,' },
      { name: '', expected: 'Hi there,' },
      { name: '   ', expected: 'Hi there,' }
    ]

    nameVariations.forEach(({ name, expected }) => {
      it(`should handle user name: "${name}"`, () => {
        const user = { ...mockUser, name }
        const taskDetails = {
          title: 'Test Page',
          type: 'page',
          url: 'https://example.com'
        }

        const result = contentAddedTemplate(mockRequest, user, taskDetails)
        expect(result.html).toContain(expected)
      })
    })
  })

  describe('Package Progress Display', () => {
    it('should show all progress types when present', () => {
      const requestWithProgress = { ...mockRequest,
        packageType: PackageType.PLATINUM,
        pagesCompleted: 3,
        blogsCompleted: 5,
        gbpPostsCompleted: 12,
        improvementsCompleted: 2
      }

      const taskDetails = {
        title: 'Test Page',
        type: 'page',
        url: 'https://example.com'
      }

      const result = contentAddedTemplate(requestWithProgress, mockUser, taskDetails)

      expect(result.html).toContain('Pages Added: <strong>3</strong>')
      expect(result.html).toContain('Blog Posts Published: <strong>5</strong>')
      expect(result.html).toContain('Google Business Posts: <strong>12</strong>')
      expect(result.html).toContain('Site Improvements: <strong>2</strong>')
    })

    it('should only show progress for completed items', () => {
      const requestWithSomeProgress = { ...mockRequest,
        packageType: PackageType.SILVER,
        pagesCompleted: 1,
        blogsCompleted: 0,
        gbpPostsCompleted: 3,
        improvementsCompleted: 0
      }

      const taskDetails = {
        title: 'Test Page',
        type: 'page',
        url: 'https://example.com'
      }

      const result = contentAddedTemplate(requestWithSomeProgress, mockUser, taskDetails)

      expect(result.html).toContain('Pages Added: <strong>1</strong>')
      expect(result.html).not.toContain('Blog Posts Published:')
      expect(result.html).toContain('Google Business Posts: <strong>3</strong>')
      expect(result.html).not.toContain('Site Improvements:')
    })

    it('should handle zero values correctly', () => {
      const requestWithZeros = { ...mockRequest,
        packageType: PackageType.GOLD,
        pagesCompleted: 0,
        blogsCompleted: 0,
        gbpPostsCompleted: 0,
        improvementsCompleted: 0
      }

      const taskDetails = {
        title: 'Test Page',
        type: 'page',
        url: 'https://example.com'
      }

      const result = contentAddedTemplate(requestWithZeros, mockUser, taskDetails)

      expect(result.html).toContain('Your SEO Progress This Month')
      expect(result.html).not.toContain('Pages Added:')
      expect(result.html).not.toContain('Blog Posts Published:')
      expect(result.html).not.toContain('Google Business Posts:')
      expect(result.html).not.toContain('Site Improvements:')
    })
  })

  describe('Custom Branding', () => {
    it('should apply custom branding colors', () => {
      const customBranding = {
        primaryColor: '#ff6b35',
        secondaryColor: '#2d3748',
        companyName: 'Custom SEO Agency'
      }

      const taskDetails = {
        title: 'Test Page',
        type: 'page',
        url: 'https://example.com'
      }

      const result = contentAddedTemplate(mockRequest, mockUser, taskDetails, customBranding)

      expect(result.html).toContain('background-color: #ff6b35')
      expect(result.html).toContain('Custom SEO Agency')
      expect(result.html).toContain('#ff6b35')
    })

    it('should use default branding when none provided', () => {
      const taskDetails = {
        title: 'Test Page',
        type: 'page',
        url: 'https://example.com'
      }

      const result = contentAddedTemplate(mockRequest, mockUser, taskDetails)

      expect(result.html).toContain(DEFAULT_BRANDING.primaryColor)
      expect(result.html).toContain(DEFAULT_BRANDING.companyName)
    })
  })

  describe('Environment Variables', () => {
    const originalEnv = process.env.NEXT_PUBLIC_APP_URL

    afterEach(() => {
      process.env.NEXT_PUBLIC_APP_URL = originalEnv
    })

    it('should handle missing APP_URL gracefully', () => {
      delete process.env.NEXT_PUBLIC_APP_URL

      const taskDetails = {
        title: 'Test Page',
        type: 'page',
        url: 'https://example.com'
      }

      const result = contentAddedTemplate(mockRequest, mockUser, taskDetails)

      expect(result.html).toContain('View all your SEO progress')
      expect(() => result.html).not.toThrow()
    })

    it('should use provided APP_URL', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://custom-domain.com'

      const taskDetails = {
        title: 'Test Page',
        type: 'page',
        url: 'https://example.com'
      }

      const result = contentAddedTemplate(mockRequest, mockUser, taskDetails)

      expect(result.html).toContain('https://custom-domain.com/dashboard')
    })
  })

  describe('HTML Structure and Accessibility', () => {
    it('should produce valid HTML structure', () => {
      const taskDetails = {
        title: 'Test Page',
        type: 'page',
        url: 'https://example.com'
      }

      const result = contentAddedTemplate(mockRequest, mockUser, taskDetails)

      // Check for essential HTML elements
      expect(result.html).toContain('<!DOCTYPE html>')
      expect(result.html).toContain('<html>')
      expect(result.html).toContain('<head>')
      expect(result.html).toContain('<meta charset="utf-8">')
      expect(result.html).toContain('<meta name="viewport"')
      expect(result.html).toContain('<title>')
      expect(result.html).toContain('<body>')
      expect(result.html).toContain('</html>')
    })

    it('should include proper meta tags for email clients', () => {
      const taskDetails = {
        title: 'Test Page',
        type: 'page',
        url: 'https://example.com'
      }

      const result = contentAddedTemplate(mockRequest, mockUser, taskDetails)

      expect(result.html).toContain('width=device-width, initial-scale=1.0')
      expect(result.html).toContain('New Content Added to Your Website')
    })

    it('should have accessible link text', () => {
      const taskDetails = {
        title: 'Test Page',
        type: 'page',
        url: 'https://example.com'
      }

      const result = contentAddedTemplate(mockRequest, mockUser, taskDetails)

      expect(result.html).toContain('View Your New Content →')
      expect(result.html).toContain('View all your SEO progress in the dashboard →')
      expect(result.html).toContain('Manage notification preferences')
    })
  })
})
