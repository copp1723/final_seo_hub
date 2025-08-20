#!/usr/bin/env npx tsx
/**
 * ANALYTICS PIPELINE TEST SCRIPT
 * 
 * Tests the full analytics data flow to identify gaps
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface TestResult {
  test: string
  status: 'PASS' | 'FAIL' | 'WARNING'
  details: string
  recommendation?: string
}

class AnalyticsPipelineValidator {
  private results: TestResult[] = []

  private addResult(result: TestResult) {
    this.results.push(result)
    const icon = result.status === 'PASS' ? '✅' : result.status === 'WARNING' ? '⚠️' : '❌'
    console.log(`${icon} ${result.test}: ${result.details}`)
    if (result.recommendation) {
      console.log(`   💡 ${result.recommendation}`)
    }
  }

  async testDealershipData(): Promise<void> {
    console.log('\n🏢 Testing Dealership Data...')
    
    const dealerships = await prisma.dealerships.findMany({
      select: {
        id: true,
        name: true,
        ga4PropertyId: true,
        website: true,
        agencyId: true
      }
    })

    // Debug: Check first few dealerships
    console.log('Debug - First 3 dealerships:')
    dealerships.slice(0, 3).forEach(d => {
      console.log(`  ${d.name}: ga4PropertyId = "${d.ga4PropertyId}" (type: ${typeof d.ga4PropertyId})`)
    })

    this.addResult({
      test: 'Dealership Count',
      status: dealerships.length >= 20 ? 'PASS' : 'WARNING',
      details: `${dealerships.length} dealerships found`,
      recommendation: dealerships.length < 20 ? 'Expected 22+ dealerships for SEOWORKS' : undefined
    })

    const dealershipsWithGA4 = dealerships.filter(d => d.ga4PropertyId !== null && d.ga4PropertyId !== '')
    this.addResult({
      test: 'GA4 Property ID Assignment',
      status: dealershipsWithGA4.length === dealerships.length ? 'PASS' : 'FAIL',
      details: `${dealershipsWithGA4.length}/${dealerships.length} dealerships have GA4 Property IDs`,
      recommendation: dealershipsWithGA4.length < dealerships.length ? 
        'All dealerships need GA4 Property IDs for analytics' : undefined
    })

    const dealershipsWithWebsites = dealerships.filter(d => d.website)
    this.addResult({
      test: 'Website URLs',
      status: dealershipsWithWebsites.length === dealerships.length ? 'PASS' : 'WARNING',
      details: `${dealershipsWithWebsites.length}/${dealerships.length} dealerships have websites`,
      recommendation: dealershipsWithWebsites.length < dealerships.length ? 
        'Websites needed for Search Console connections' : undefined
    })
  }

  async testUserAccess(): Promise<void> {
    console.log('\n👥 Testing User Access...')

    const users = await prisma.users.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        dealershipId: true,
        agencyId: true
      }
    })

    const usersWithDealerships = users.filter(u => u.dealershipId)
    this.addResult({
      test: 'User-Dealership Assignments',
      status: usersWithDealerships.length > 0 ? 'PASS' : 'FAIL',
      details: `${usersWithDealerships.length}/${users.length} users assigned to dealerships`,
      recommendation: usersWithDealerships.length === 0 ? 
        'Users need dealership assignments to view analytics' : undefined
    })

    const adminUsers = users.filter(u => 
      ['SUPER_ADMIN', 'AGENCY_ADMIN', 'DEALERSHIP_ADMIN'].includes(u.role)
    )
    this.addResult({
      test: 'Admin User Access',
      status: adminUsers.length > 0 ? 'PASS' : 'FAIL',
      details: `${adminUsers.length} admin users (can manage OAuth connections)`,
      recommendation: adminUsers.length === 0 ? 
        'Need admin users to set up OAuth connections' : undefined
    })
  }

  async testOAuthConnections(): Promise<void> {
    console.log('\n🔌 Testing OAuth Connections...')

    const ga4Connections = await prisma.ga4_connections.count()
    this.addResult({
      test: 'GA4 OAuth Connections',
      status: ga4Connections > 0 ? 'PASS' : 'FAIL',
      details: `${ga4Connections} GA4 connections found`,
      recommendation: ga4Connections === 0 ? 
        'CRITICAL: No GA4 OAuth connections - analytics will not work' : undefined
    })

    const searchConsoleConnections = await prisma.search_console_connections.count()
    this.addResult({
      test: 'Search Console OAuth Connections',
      status: searchConsoleConnections > 0 ? 'PASS' : 'FAIL',
      details: `${searchConsoleConnections} Search Console connections found`,
      recommendation: searchConsoleConnections === 0 ? 
        'CRITICAL: No Search Console connections - search data will not work' : undefined
    })
  }

  async testEnvironmentConfig(): Promise<void> {
    console.log('\n⚙️ Testing Environment Configuration...')

    const hasGoogleClientId = !!process.env.GOOGLE_CLIENT_ID
    this.addResult({
      test: 'Google OAuth Client ID',
      status: hasGoogleClientId ? 'PASS' : 'FAIL',
      details: hasGoogleClientId ? 'Client ID configured' : 'Client ID missing',
      recommendation: !hasGoogleClientId ? 
        'CRITICAL: GOOGLE_CLIENT_ID required for OAuth' : undefined
    })

    const hasGoogleClientSecret = !!process.env.GOOGLE_CLIENT_SECRET
    this.addResult({
      test: 'Google OAuth Client Secret',
      status: hasGoogleClientSecret ? 'PASS' : 'FAIL',
      details: hasGoogleClientSecret ? 'Client Secret configured' : 'Client Secret missing',
      recommendation: !hasGoogleClientSecret ? 
        'CRITICAL: GOOGLE_CLIENT_SECRET required for OAuth' : undefined
    })

    const hasDatabaseUrl = !!process.env.DATABASE_URL
    this.addResult({
      test: 'Database Connection',
      status: hasDatabaseUrl ? 'PASS' : 'FAIL',
      details: hasDatabaseUrl ? 'Database URL configured' : 'Database URL missing'
    })
  }

  async generateReport(): Promise<void> {
    console.log('\n📊 ANALYTICS PIPELINE VALIDATION REPORT')
    console.log('=' .repeat(60))

    const passed = this.results.filter(r => r.status === 'PASS').length
    const warnings = this.results.filter(r => r.status === 'WARNING').length
    const failed = this.results.filter(r => r.status === 'FAIL').length

    console.log(`\n📈 Summary: ${passed} PASSED | ${warnings} WARNINGS | ${failed} FAILED\n`)

    // Critical blockers
    const criticalFailures = this.results.filter(r => 
      r.status === 'FAIL' && r.recommendation?.includes('CRITICAL')
    )

    if (criticalFailures.length > 0) {
      console.log('🚨 CRITICAL BLOCKERS (Analytics Will Not Work):')
      criticalFailures.forEach(failure => {
        console.log(`   ❌ ${failure.test}: ${failure.details}`)
        console.log(`      ${failure.recommendation}`)
      })
    }

    // Non-critical failures
    const nonCriticalFailures = this.results.filter(r => 
      r.status === 'FAIL' && !r.recommendation?.includes('CRITICAL')
    )

    if (nonCriticalFailures.length > 0) {
      console.log('\n⚠️ OTHER ISSUES:')
      nonCriticalFailures.forEach(failure => {
        console.log(`   ❌ ${failure.test}: ${failure.details}`)
        if (failure.recommendation) {
          console.log(`      ${failure.recommendation}`)
        }
      })
    }

    // Warnings
    const warningIssues = this.results.filter(r => r.status === 'WARNING')
    if (warningIssues.length > 0) {
      console.log('\n🟡 WARNINGS:')
      warningIssues.forEach(warning => {
        console.log(`   ⚠️ ${warning.test}: ${warning.details}`)
        if (warning.recommendation) {
          console.log(`      ${warning.recommendation}`)
        }
      })
    }

    console.log('\n🎯 NEXT STEPS TO FIX ANALYTICS:')
    if (criticalFailures.length > 0) {
      console.log('1. 🚨 Fix critical blockers first (OAuth setup)')
      console.log('2. 🔑 Configure Google OAuth credentials in environment')
      console.log('3. 🔗 Have admin users connect GA4 and Search Console')
      console.log('4. 📊 Test analytics data flow')
    } else {
      console.log('✅ No critical blockers - analytics should work!')
    }

    console.log('\n💡 ANALYTICS SETUP GUIDE:')
    console.log('1. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET')
    console.log('2. Login as admin user (SUPER_ADMIN or AGENCY_ADMIN)')
    console.log('3. Go to Settings > Integrations')
    console.log('4. Connect Google Analytics 4')
    console.log('5. Connect Google Search Console')
    console.log('6. Analytics data will start flowing within 24 hours')
  }

  async runFullTest(): Promise<boolean> {
    try {
      console.log('🚀 Starting Analytics Pipeline Validation...\n')

      await this.testDealershipData()
      await this.testUserAccess()
      await this.testOAuthConnections()
      await this.testEnvironmentConfig()
      await this.generateReport()

      // Return true if no critical failures
      const criticalFailures = this.results.filter(r => 
        r.status === 'FAIL' && r.recommendation?.includes('CRITICAL')
      )
      return criticalFailures.length === 0

    } catch (error) {
      console.error('❌ Pipeline validation failed:', error)
      return false
    } finally {
      await prisma.$disconnect()
    }
  }
}

// CLI execution
if (require.main === module) {
  const validator = new AnalyticsPipelineValidator()
  
  validator.runFullTest()
    .then(success => {
      if (success) {
        console.log('\n🎉 Analytics pipeline validation completed - no critical issues!')
        process.exit(0)
      } else {
        console.log('\n🚨 Analytics pipeline has critical issues that must be fixed!')
        process.exit(1)
      }
    })
    .catch(error => {
      console.error('Validation error:', error)
      process.exit(1)
    })
}

export default AnalyticsPipelineValidator