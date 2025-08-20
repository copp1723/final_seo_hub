#!/usr/bin/env npx tsx
/**
 * EMERGENCY DATABASE RECOVERY VALIDATION SCRIPT
 * 
 * Comprehensive validation of database recovery completeness
 * Created in response to production database wipe incident
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface ValidationResult {
  table: string
  expected: number
  actual: number
  status: 'PASS' | 'FAIL' | 'WARNING'
  details?: string[]
}

class DatabaseRecoveryValidator {
  private results: ValidationResult[] = []

  async validateCoreSchema(): Promise<boolean> {
    console.log('🔍 Validating core database schema...')
    
    const requiredTables = [
      'users', 'agencies', 'dealerships', 'accounts', 'sessions',
      'ga4_connections', 'search_console_connections', 'user_preferences',
      'system_settings', 'requests', 'tasks', 'audit_logs'
    ]

    try {
      // Check if all required tables exist
      for (const table of requiredTables) {
        const result = await prisma.$queryRaw`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = ${table}
          );
        ` as any[]
        
        if (!result[0]?.exists) {
          throw new Error(`Critical table missing: ${table}`)
        }
      }
      
      console.log('✅ All core tables present')
      return true
    } catch (error) {
      console.error('❌ Schema validation failed:', error)
      return false
    }
  }

  async validateUserHierarchy(): Promise<void> {
    console.log('👥 Validating user hierarchy...')

    // Super admin validation
    const superAdmins = await prisma.users.count({
      where: { role: 'SUPER_ADMIN' }
    })
    
    this.results.push({
      table: 'users',
      expected: 1,
      actual: superAdmins,
      status: superAdmins >= 1 ? 'PASS' : 'FAIL',
      details: superAdmins === 0 ? ['No super admin users found'] : undefined
    })

    // Check user-agency relationships
    const usersWithoutAgency = await prisma.users.count({
      where: { 
        agencyId: null,
        role: { not: 'SUPER_ADMIN' }
      }
    })

    this.results.push({
      table: 'user_agency_relationship',
      expected: 0,
      actual: usersWithoutAgency,
      status: usersWithoutAgency === 0 ? 'PASS' : 'WARNING',
      details: usersWithoutAgency > 0 ? [`${usersWithoutAgency} non-super-admin users without agency assignment`] : undefined
    })
  }

  async validateAgencyStructure(): Promise<void> {
    console.log('🏢 Validating agency structure...')

    const agencies = await prisma.agencies.findMany({
      include: {
        dealerships: true,
        users: true
      }
    })

    // Expected: 2 agencies (Sample + SEOWORKS)
    this.results.push({
      table: 'agencies',
      expected: 2,
      actual: agencies.length,
      status: agencies.length >= 2 ? 'PASS' : 'FAIL',
      details: agencies.length < 2 ? ['Missing expected agencies (Sample Auto Agency, SEOWORKS)'] : undefined
    })

    // Validate SEOWORKS agency specifically
    const seoworksAgency = agencies.find(a => 
      a.name.toLowerCase().includes('seoworks') || 
      a.name.toLowerCase().includes('seo')
    )

    if (seoworksAgency) {
      this.results.push({
        table: 'seoworks_dealerships',
        expected: 22,
        actual: seoworksAgency.dealerships.length,
        status: seoworksAgency.dealerships.length >= 20 ? 'PASS' : 'WARNING',
        details: seoworksAgency.dealerships.length < 22 ? 
          [`SEOWORKS has ${seoworksAgency.dealerships.length}/22 expected dealerships`] : undefined
      })
    } else {
      this.results.push({
        table: 'seoworks_agency',
        expected: 1,
        actual: 0,
        status: 'FAIL',
        details: ['SEOWORKS agency not found']
      })
    }
  }

  async validateCriticalConnections(): Promise<void> {
    console.log('🔌 Validating critical connections...')

    // Check for dealerships with client IDs
    const dealershipsWithClientIds = await prisma.dealerships.count({
      where: { clientId: { not: null } }
    })

    const totalDealerships = await prisma.dealerships.count()
    
    this.results.push({
      table: 'dealership_client_ids',
      expected: totalDealerships,
      actual: dealershipsWithClientIds,
      status: dealershipsWithClientIds === totalDealerships ? 'PASS' : 'WARNING',
      details: dealershipsWithClientIds < totalDealerships ? 
        [`${totalDealerships - dealershipsWithClientIds} dealerships missing client IDs`] : undefined
    })

    // Check system settings
    const systemSettings = await prisma.system_settings.count()
    this.results.push({
      table: 'system_settings',
      expected: 1,
      actual: systemSettings,
      status: systemSettings === 1 ? 'PASS' : 'FAIL',
      details: systemSettings === 0 ? ['System settings not initialized'] : undefined
    })
  }

  async validateDataIntegrity(): Promise<void> {
    console.log('🔐 Validating data integrity...')

    // Check for orphaned records
    const orphanedRequests = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM requests r 
      LEFT JOIN users u ON r."userId" = u.id 
      WHERE u.id IS NULL
    ` as any[]

    this.results.push({
      table: 'orphaned_requests',
      expected: 0,
      actual: Number(orphanedRequests[0]?.count || 0),
      status: Number(orphanedRequests[0]?.count || 0) === 0 ? 'PASS' : 'WARNING',
      details: Number(orphanedRequests[0]?.count || 0) > 0 ? ['Orphaned requests found'] : undefined
    })

    // Check foreign key constraints
    const constraintViolations = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM dealerships d 
      LEFT JOIN agencies a ON d."agencyId" = a.id 
      WHERE a.id IS NULL
    ` as any[]

    this.results.push({
      table: 'foreign_key_integrity',
      expected: 0,
      actual: Number(constraintViolations[0]?.count || 0),
      status: Number(constraintViolations[0]?.count || 0) === 0 ? 'PASS' : 'FAIL',
      details: Number(constraintViolations[0]?.count || 0) > 0 ? ['Foreign key constraint violations found'] : undefined
    })
  }

  async generateRecoveryReport(): Promise<void> {
    console.log('\n📊 DATABASE RECOVERY VALIDATION REPORT')
    console.log('=' .repeat(60))

    const passed = this.results.filter(r => r.status === 'PASS').length
    const warnings = this.results.filter(r => r.status === 'WARNING').length
    const failed = this.results.filter(r => r.status === 'FAIL').length

    console.log(`\n📈 Summary: ${passed} PASSED | ${warnings} WARNINGS | ${failed} FAILED`)
    console.log('\nDetailed Results:')

    for (const result of this.results) {
      const statusIcon = result.status === 'PASS' ? '✅' : 
                        result.status === 'WARNING' ? '⚠️' : '❌'
      
      console.log(`\n${statusIcon} ${result.table}`)
      console.log(`   Expected: ${result.expected} | Actual: ${result.actual}`)
      
      if (result.details && result.details.length > 0) {
        result.details.forEach(detail => {
          console.log(`   - ${detail}`)
        })
      }
    }

    // Recovery recommendations
    console.log('\n🔧 RECOVERY RECOMMENDATIONS:')
    
    const failedChecks = this.results.filter(r => r.status === 'FAIL')
    if (failedChecks.length === 0) {
      console.log('✅ No critical failures detected. Database recovery appears successful.')
    } else {
      console.log('❌ Critical failures detected. Immediate action required:')
      failedChecks.forEach(check => {
        console.log(`   • Fix ${check.table}: ${check.details?.[0] || 'See details above'}`)
      })
    }

    const warningChecks = this.results.filter(r => r.status === 'WARNING')
    if (warningChecks.length > 0) {
      console.log('\n⚠️ Warnings (recommended fixes):')
      warningChecks.forEach(check => {
        console.log(`   • ${check.table}: ${check.details?.[0] || 'See details above'}`)
      })
    }

    // Next steps
    console.log('\n🎯 NEXT STEPS:')
    console.log('1. Review any failed validations and re-run recovery scripts')
    console.log('2. Test user authentication and authorization')
    console.log('3. Verify OAuth integrations (GA4, Search Console)')
    console.log('4. Run integration tests to ensure API functionality')
    console.log('5. Implement enhanced backup strategy (see backup architecture plan)')
  }

  async runFullValidation(): Promise<boolean> {
    try {
      console.log('🚀 Starting database recovery validation...\n')

      // Run all validation checks
      const schemaValid = await this.validateCoreSchema()
      if (!schemaValid) {
        throw new Error('Core schema validation failed')
      }

      await this.validateUserHierarchy()
      await this.validateAgencyStructure()
      await this.validateCriticalConnections()
      await this.validateDataIntegrity()

      // Generate report
      await this.generateRecoveryReport()

      // Return overall success status
      const hasFailures = this.results.some(r => r.status === 'FAIL')
      return !hasFailures

    } catch (error) {
      console.error('\n❌ Validation failed with error:', error)
      return false
    } finally {
      await prisma.$disconnect()
    }
  }
}

// CLI execution
if (require.main === module) {
  const validator = new DatabaseRecoveryValidator()
  
  validator.runFullValidation()
    .then(success => {
      if (success) {
        console.log('\n🎉 Database recovery validation completed successfully!')
        process.exit(0)
      } else {
        console.log('\n🚨 Database recovery validation failed!')
        process.exit(1)
      }
    })
    .catch(error => {
      console.error('Validation error:', error)
      process.exit(1)
    })
}

export default DatabaseRecoveryValidator