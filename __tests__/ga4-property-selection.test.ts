/**
 * CRITICAL TESTS: GA4 Property Selection Logic
 * 
 * These tests MUST pass to prevent regressions where all dealerships
 * show the same GA4 data. DO NOT modify these tests without understanding
 * the business impact.
 */

import { DealershipAnalyticsService } from '@/lib/google/dealership-analytics-service'
import { getGA4PropertyId, hasGA4Access, DEALERSHIP_PROPERTY_MAPPINGS } from '@/lib/dealership-property-mapping'
import { prisma } from '@/lib/prisma'

// Mock the external dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    ga4_connections: {
      findFirst: jest.fn()
    }
  }
}))

jest.mock('@/lib/google/ga4Service', () => ({
  GA4Service: jest.fn().mockImplementation(() => ({
    initialize: jest.fn(),
    batchRunReports: jest.fn().mockResolvedValue([{
      rows: [{
        metricValues: [
          { value: '1000' }, // sessions
          { value: '800' },  // users
          { value: '5000' }  // events
        ]
      }]
    }])
  }))
}))

jest.mock('@/lib/google/ga4-token-refresh', () => ({
  refreshGA4TokenIfNeeded: jest.fn()
}))

describe('GA4 Property Selection Logic', () => {
  const mockConnection = {
    id: 'test-connection',
    propertyId: '320759942', // Jay Hatfield Chevrolet of Vinita
    propertyName: 'Jay Hatfield Chevrolet'
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(prisma.ga4_connections.findFirst as jest.Mock).mockResolvedValue(mockConnection)
  })

  describe('CRITICAL: Each dealership must use its own property', () => {
    test('Dealership with specific mapping uses its own property ID', async () => {
      const service = new DealershipAnalyticsService()
      
      // Test Acura of Columbus (should use 284944578, not fallback)
      const result = await service.getDealershipGA4Data({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        dealershipId: 'dealer-acura-columbus',
        userId: 'test-user'
      })

      expect(result.propertyId).toBe('284944578') // Acura's specific property
      expect(result.propertyId).not.toBe('320759942') // NOT the fallback property
    })

    test('Different dealerships return different property IDs', async () => {
      const service = new DealershipAnalyticsService()
      const testCases = [
        { dealershipId: 'dealer-acura-columbus', expectedPropertyId: '284944578' },
        { dealershipId: 'dealer-jhc-columbus', expectedPropertyId: '323480238' },
        { dealershipId: 'dealer-jhc-vinita', expectedPropertyId: '320759942' },
        { dealershipId: 'dealer-genesis-wichita', expectedPropertyId: '323502411' }
      ]

      const results = []
      for (const testCase of testCases) {
        const result = await service.getDealershipGA4Data({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          dealershipId: testCase.dealershipId,
          userId: 'test-user'
        })
        results.push({
          dealershipId: testCase.dealershipId,
          actualPropertyId: result.propertyId,
          expectedPropertyId: testCase.expectedPropertyId
        })
      }

      // CRITICAL: Each dealership must have its own unique property ID
      results.forEach(result => {
        expect(result.actualPropertyId).toBe(result.expectedPropertyId)
      })

      // CRITICAL: No two dealerships should have the same property ID (unless intentionally mapped)
      const propertyIds = results.map(r => r.actualPropertyId)
      const uniquePropertyIds = [...new Set(propertyIds)]
      expect(uniquePropertyIds.length).toBe(propertyIds.length) // All should be unique
    })

    test('Dealership without mapping falls back to user connection', async () => {
      const service = new DealershipAnalyticsService()
      
      // Test with a dealership ID that doesn't exist in mappings
      const result = await service.getDealershipGA4Data({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        dealershipId: 'dealer-nonexistent',
        userId: 'test-user'
      })

      expect(result.propertyId).toBe('320759942') // Should use user connection
    })
  })

  describe('Property Mapping Validation', () => {
    test('All mapped dealerships have valid property IDs', () => {
      DEALERSHIP_PROPERTY_MAPPINGS.forEach(mapping => {
        if (mapping.hasAccess) {
          expect(mapping.ga4PropertyId).toBeTruthy()
          expect(mapping.ga4PropertyId).toMatch(/^\d+$/) // Should be numeric string
        }
      })
    })

    test('No duplicate property IDs in mappings (unless intentional)', () => {
      const propertyIds = DEALERSHIP_PROPERTY_MAPPINGS
        .filter(m => m.ga4PropertyId && m.hasAccess)
        .map(m => m.ga4PropertyId)
      
      const duplicates = propertyIds.filter((id, index) => propertyIds.indexOf(id) !== index)
      
      // Log duplicates for review (some may be intentional)
      if (duplicates.length > 0) {
        console.warn('Duplicate property IDs found:', duplicates)
      }
    })

    test('Helper functions work correctly', () => {
      // Test getGA4PropertyId
      expect(getGA4PropertyId('dealer-acura-columbus')).toBe('284944578')
      expect(getGA4PropertyId('dealer-nonexistent')).toBeNull()

      // Test hasGA4Access
      expect(hasGA4Access('dealer-acura-columbus')).toBe(true)
      expect(hasGA4Access('dealer-world-kia')).toBe(false) // No access
    })
  })

  describe('REGRESSION PREVENTION: The exact bug we fixed', () => {
    test('MUST NOT fall back to user connection when dealership has valid mapping', async () => {
      const service = new DealershipAnalyticsService()
      
      // This is the exact scenario that was broken:
      // User has connection to property 320759942
      // Dealership (Acura) is mapped to property 284944578
      // System MUST use 284944578, NOT fall back to 320759942
      
      const result = await service.getDealershipGA4Data({
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        dealershipId: 'dealer-acura-columbus',
        userId: 'test-user'
      })

      // CRITICAL ASSERTION: Must use dealership property, not user connection
      expect(result.propertyId).toBe('284944578') // Acura's property
      expect(result.propertyId).not.toBe('320759942') // NOT user's connection property
      
      // This test failing means the bug has returned
      if (result.propertyId === '320759942') {
        throw new Error('CRITICAL REGRESSION: Dealership is using user connection instead of its own property!')
      }
    })
  })
})
