#!/usr/bin/env npx tsx
/**
 * DATABASE SECURITY AUDIT & ACCESS CONTROL SYSTEM
 * 
 * Comprehensive security assessment and access control framework
 * to prevent unauthorized database access and operations
 */

import { PrismaClient } from '@prisma/client'
import { promises as fs } from 'fs'
import { join } from 'path'
import { createHash } from 'crypto'

const prisma = new PrismaClient()

interface SecurityFinding {
  category: 'ACCESS_CONTROL' | 'ENCRYPTION' | 'AUDIT' | 'NETWORK' | 'PRIVILEGES'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  title: string
  description: string
  recommendation: string
  remediation?: string
}

interface AccessControlRule {
  id: string
  role: string
  resource: string
  actions: string[]
  conditions?: string[]
  priority: number
}

class DatabaseSecurityAuditor {
  private findings: SecurityFinding[] = []
  private logFile: string

  constructor() {
    this.logFile = join(process.cwd(), 'logs', 'security-audit.log')
  }

  private log(level: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL', message: string): void {
    const timestamp = new Date().toISOString()
    const logEntry = `[${timestamp}] [${level}] ${message}\n`
    
    console.log(logEntry.trim())
    fs.appendFile(this.logFile, logEntry).catch(console.error)
  }

  private addFinding(finding: SecurityFinding): void {
    this.findings.push(finding)
    this.log(finding.severity === 'CRITICAL' ? 'CRITICAL' : 'WARN', 
      `${finding.category}: ${finding.title}`)
  }

  async auditDatabaseConnections(): Promise<void> {
    this.log('INFO', 'Auditing database connections and access patterns...')

    try {
      // Check for unencrypted connections
      const databaseUrl = process.env.DATABASE_URL || ''
      
      if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
        this.addFinding({
          category: 'NETWORK',
          severity: 'HIGH',
          title: 'Invalid Database URL Protocol',
          description: 'Database URL does not use PostgreSQL protocol',
          recommendation: 'Ensure DATABASE_URL uses postgresql:// or postgres:// protocol'
        })
      }

      if (!databaseUrl.includes('sslmode=require') && !databaseUrl.includes('ssl=true')) {
        this.addFinding({
          category: 'NETWORK',
          severity: 'HIGH',
          title: 'SSL/TLS Not Enforced',
          description: 'Database connection may not enforce SSL/TLS encryption',
          recommendation: 'Add sslmode=require to DATABASE_URL or configure SSL',
          remediation: 'DATABASE_URL should include ?sslmode=require'
        })
      }

      // Check for exposed credentials
      if (databaseUrl.includes('password=') && !process.env.CI) {
        this.addFinding({
          category: 'ACCESS_CONTROL',
          severity: 'CRITICAL',
          title: 'Exposed Database Credentials',
          description: 'Database password may be visible in environment variables',
          recommendation: 'Use environment variable encryption or secret management',
          remediation: 'Implement proper secret management system'
        })
      }

    } catch (error) {
      this.log('ERROR', `Database connection audit failed: ${error}`)
    }
  }

  async auditUserPrivileges(): Promise<void> {
    this.log('INFO', 'Auditing user privileges and role assignments...')

    try {
      // Check for users with inappropriate privileges
      const superAdmins = await prisma.users.findMany({
        where: { role: 'SUPER_ADMIN' },
        select: { id: true, email: true, createdAt: true }
      })

      if (superAdmins.length === 0) {
        this.addFinding({
          category: 'ACCESS_CONTROL',
          severity: 'CRITICAL',
          title: 'No Super Admin Users',
          description: 'No super admin users found in the system',
          recommendation: 'Ensure at least one super admin user exists',
          remediation: 'Create super admin user via seeding script'
        })
      }

      if (superAdmins.length > 3) {
        this.addFinding({
          category: 'ACCESS_CONTROL',
          severity: 'MEDIUM',
          title: 'Excessive Super Admin Users',
          description: `${superAdmins.length} super admin users found`,
          recommendation: 'Limit super admin users to essential personnel only',
          remediation: 'Review and downgrade unnecessary super admin accounts'
        })
      }

      // Check for users without agency assignment
      const orphanedUsers = await prisma.users.count({
        where: {
          agencyId: null,
          role: { not: 'SUPER_ADMIN' }
        }
      })

      if (orphanedUsers > 0) {
        this.addFinding({
          category: 'ACCESS_CONTROL',
          severity: 'MEDIUM',
          title: 'Orphaned User Accounts',
          description: `${orphanedUsers} users found without agency assignment`,
          recommendation: 'Assign users to appropriate agencies or deactivate accounts',
          remediation: 'Review user assignments and update agencyId fields'
        })
      }

      // Check for inactive users with active sessions
      const inactiveUsersWithSessions = await prisma.users.findMany({
        where: {
          updatedAt: {
            lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // 90 days
          }
        },
        include: {
          sessions: {
            where: {
              expires: {
                gt: new Date()
              }
            }
          }
        }
      })

      const problematicUsers = inactiveUsersWithSessions.filter(u => u.sessions.length > 0)
      if (problematicUsers.length > 0) {
        this.addFinding({
          category: 'ACCESS_CONTROL',
          severity: 'MEDIUM',
          title: 'Inactive Users with Active Sessions',
          description: `${problematicUsers.length} inactive users have active sessions`,
          recommendation: 'Implement automatic session cleanup for inactive users',
          remediation: 'Clean up stale sessions and implement session timeout policies'
        })
      }

    } catch (error) {
      this.log('ERROR', `User privilege audit failed: ${error}`)
    }
  }

  async auditSensitiveData(): Promise<void> {
    this.log('INFO', 'Auditing sensitive data protection...')

    try {
      // Check for unencrypted OAuth tokens
      const ga4Connections = await prisma.ga4_connections.count()
      const searchConsoleConnections = await prisma.search_console_connections.count()

      if (ga4Connections > 0) {
        this.addFinding({
          category: 'ENCRYPTION',
          severity: 'HIGH',
          title: 'OAuth Tokens in Database',
          description: `${ga4Connections} GA4 connections with stored access tokens`,
          recommendation: 'Ensure OAuth tokens are encrypted at rest',
          remediation: 'Implement token encryption using crypto libraries'
        })
      }

      if (searchConsoleConnections > 0) {
        this.addFinding({
          category: 'ENCRYPTION',
          severity: 'HIGH',
          title: 'Search Console Tokens in Database',
          description: `${searchConsoleConnections} Search Console connections with stored tokens`,
          recommendation: 'Ensure OAuth tokens are encrypted at rest',
          remediation: 'Implement token encryption using crypto libraries'
        })
      }

      // Check for API keys in plain text
      const usersWithApiKeys = await prisma.users.count({
        where: { apiKey: { not: null } }
      })

      if (usersWithApiKeys > 0) {
        this.addFinding({
          category: 'ENCRYPTION',
          severity: 'HIGH',
          title: 'API Keys in Database',
          description: `${usersWithApiKeys} users have stored API keys`,
          recommendation: 'Hash API keys and store only hashed values',
          remediation: 'Implement API key hashing before storage'
        })
      }

      // Check for password storage
      const usersWithPasswords = await prisma.users.count({
        where: { password: { not: null } }
      })

      if (usersWithPasswords > 0) {
        this.addFinding({
          category: 'ENCRYPTION',
          severity: 'CRITICAL',
          title: 'Password Storage Detected',
          description: `${usersWithPasswords} users have stored passwords`,
          recommendation: 'Ensure passwords are properly hashed with bcrypt/argon2',
          remediation: 'Verify password hashing implementation and migrate if needed'
        })
      }

    } catch (error) {
      this.log('ERROR', `Sensitive data audit failed: ${error}`)
    }
  }

  async auditAuditLogging(): Promise<void> {
    this.log('INFO', 'Auditing audit logging configuration...')

    try {
      // Check if audit logging is enabled
      const systemSettings = await prisma.system_settings.findFirst({
        where: { id: 'default' }
      })

      if (!systemSettings || !systemSettings.auditLogging) {
        this.addFinding({
          category: 'AUDIT',
          severity: 'HIGH',
          title: 'Audit Logging Disabled',
          description: 'System audit logging is not enabled',
          recommendation: 'Enable audit logging for all critical operations',
          remediation: 'Update system_settings.auditLogging to true'
        })
      }

      // Check audit log coverage
      const auditLogCount = await prisma.audit_logs.count()
      const totalUsers = await prisma.users.count()

      if (totalUsers > 0 && auditLogCount === 0) {
        this.addFinding({
          category: 'AUDIT',
          severity: 'MEDIUM',
          title: 'No Audit Logs Found',
          description: 'No audit logs found despite active users',
          recommendation: 'Verify audit logging implementation',
          remediation: 'Check audit log triggers and middleware'
        })
      }

      // Check for audit log retention
      const oldestLog = await prisma.audit_logs.findFirst({
        orderBy: { createdAt: 'asc' }
      })

      if (oldestLog) {
        const logAge = Date.now() - new Date(oldestLog.createdAt).getTime()
        const daysOld = logAge / (1000 * 60 * 60 * 24)

        if (daysOld > 365) {
          this.addFinding({
            category: 'AUDIT',
            severity: 'LOW',
            title: 'Audit Log Retention Too Long',
            description: `Audit logs retained for ${Math.round(daysOld)} days`,
            recommendation: 'Implement audit log archival and cleanup',
            remediation: 'Create audit log retention policy and cleanup job'
          })
        }
      }

    } catch (error) {
      this.log('ERROR', `Audit logging audit failed: ${error}`)
    }
  }

  async checkDatabasePrivileges(): Promise<void> {
    this.log('INFO', 'Checking database-level privileges...')

    try {
      // Check current database user privileges
      const currentUser = await prisma.$queryRaw<Array<{ usename: string }>>`SELECT current_user as usename`
      const userName = currentUser[0]?.usename

      if (userName) {
        // Check if user has superuser privileges
        const userPrivileges = await prisma.$queryRaw<Array<{ usesuper: boolean }>>`
          SELECT usesuper FROM pg_user WHERE usename = ${userName}
        `

        if (userPrivileges[0]?.usesuper) {
          this.addFinding({
            category: 'PRIVILEGES',
            severity: 'HIGH',
            title: 'Application Uses Superuser Database Account',
            description: 'Application is connecting with superuser privileges',
            recommendation: 'Use dedicated application user with minimal privileges',
            remediation: 'Create dedicated database user with only required permissions'
          })
        }
      }

      // Check for public schema permissions
      const publicPerms = await prisma.$queryRaw<Array<{ privileges: string }>>`
        SELECT array_to_string(ARRAY(
          SELECT privilege_type 
          FROM information_schema.table_privileges 
          WHERE grantee = 'PUBLIC' AND table_schema = 'public'
        ), ', ') as privileges
      `

      if (publicPerms[0]?.privileges) {
        this.addFinding({
          category: 'PRIVILEGES',
          severity: 'MEDIUM',
          title: 'Public Schema Has Permissions',
          description: `Public role has privileges: ${publicPerms[0].privileges}`,
          recommendation: 'Revoke unnecessary public permissions',
          remediation: 'REVOKE permissions FROM PUBLIC on sensitive tables'
        })
      }

    } catch (error) {
      this.log('ERROR', `Database privilege check failed: ${error}`)
    }
  }

  generateSecurityRecommendations(): string[] {
    const recommendations = [
      '🔐 Implement database connection encryption (SSL/TLS)',
      '🔑 Use environment-based secret management',
      '👥 Implement principle of least privilege for all users',
      '📝 Enable comprehensive audit logging',
      '🔒 Encrypt sensitive data at rest (OAuth tokens, API keys)',
      '⏰ Implement automatic session timeout',
      '🗄️ Use dedicated database user with minimal privileges',
      '📊 Set up monitoring for suspicious database activity',
      '🔄 Implement regular security audits',
      '📋 Document access control policies and procedures'
    ]

    return recommendations
  }

  async createAccessControlPolicy(): Promise<void> {
    const accessControlRules: AccessControlRule[] = [
      {
        id: 'super-admin-full',
        role: 'SUPER_ADMIN',
        resource: '*',
        actions: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
        priority: 100
      },
      {
        id: 'agency-admin-agency',
        role: 'AGENCY_ADMIN',
        resource: 'agency',
        actions: ['READ', 'UPDATE'],
        conditions: ['resource.id === user.agencyId'],
        priority: 80
      },
      {
        id: 'agency-admin-dealerships',
        role: 'AGENCY_ADMIN',
        resource: 'dealership',
        actions: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
        conditions: ['resource.agencyId === user.agencyId'],
        priority: 80
      },
      {
        id: 'dealership-admin-dealership',
        role: 'DEALERSHIP_ADMIN',
        resource: 'dealership',
        actions: ['READ', 'UPDATE'],
        conditions: ['resource.id === user.dealershipId'],
        priority: 60
      },
      {
        id: 'user-own-data',
        role: 'USER',
        resource: 'user',
        actions: ['READ', 'UPDATE'],
        conditions: ['resource.id === user.id'],
        priority: 40
      }
    ]

    const policyDocument = `# DATABASE ACCESS CONTROL POLICY

## Overview
This document defines role-based access control (RBAC) policies for database operations.

## Role Hierarchy

### 🔴 SUPER_ADMIN
- **Scope**: Global system access
- **Permissions**: Full CRUD on all resources
- **Restrictions**: Limited to essential personnel
- **Audit**: All actions logged and monitored

### 🟡 AGENCY_ADMIN  
- **Scope**: Single agency and its dealerships
- **Permissions**: 
  - Read/Update own agency
  - Full CRUD on agency dealerships
  - Manage agency users
- **Restrictions**: Cannot access other agencies

### 🟢 DEALERSHIP_ADMIN
- **Scope**: Single dealership
- **Permissions**:
  - Read/Update own dealership
  - Manage dealership users
  - Access dealership analytics
- **Restrictions**: Cannot access other dealerships

### 🔵 USER
- **Scope**: Own user account and assigned dealership data
- **Permissions**:
  - Read/Update own profile
  - Access assigned dealership data (read-only)
- **Restrictions**: Cannot modify dealership settings

## Access Control Rules

${JSON.stringify(accessControlRules, null, 2)}

## Security Enforcement

### Database Level
- Row-level security (RLS) policies
- Function-based access controls
- Audit triggers on sensitive tables

### Application Level  
- Middleware-based authorization
- JWT token validation
- Session management
- API rate limiting

### Network Level
- SSL/TLS encryption required
- VPN access for administrative operations
- IP allowlisting for production access

## Violation Response

### Immediate Actions
1. 🛑 Block suspicious access
2. 📝 Log security event
3. 🚨 Alert security team
4. 🔍 Investigate incident

### Investigation Process
1. Identify violation source
2. Assess potential data exposure
3. Document incident details
4. Implement corrective measures

## Compliance Requirements

### Audit Trail
- All database operations logged
- User access patterns monitored
- Regular access reviews conducted
- Privilege escalation tracked

### Data Protection
- PII encryption at rest
- OAuth token encryption
- API key hashing
- Secure data deletion

## Review Schedule

- **Daily**: Automated security scans
- **Weekly**: Access pattern analysis  
- **Monthly**: Privilege review
- **Quarterly**: Full security audit
- **Annually**: Policy update review`

    const policyPath = join(process.cwd(), 'DATABASE_ACCESS_CONTROL_POLICY.md')
    await fs.writeFile(policyPath, policyDocument)
    
    this.log('INFO', `Access control policy created: ${policyPath}`)
  }

  async generateSecurityReport(): Promise<void> {
    this.log('INFO', 'Generating comprehensive security report...')

    const criticalFindings = this.findings.filter(f => f.severity === 'CRITICAL')
    const highFindings = this.findings.filter(f => f.severity === 'HIGH')
    const mediumFindings = this.findings.filter(f => f.severity === 'MEDIUM')
    const lowFindings = this.findings.filter(f => f.severity === 'LOW')

    console.log('\n🔒 DATABASE SECURITY AUDIT REPORT')
    console.log('=' .repeat(60))
    console.log(`Audit Date: ${new Date().toISOString()}`)
    console.log(`Total Findings: ${this.findings.length}`)
    console.log(`Critical: ${criticalFindings.length} | High: ${highFindings.length} | Medium: ${mediumFindings.length} | Low: ${lowFindings.length}`)

    // Critical findings
    if (criticalFindings.length > 0) {
      console.log('\n🚨 CRITICAL FINDINGS (Immediate Action Required)')
      console.log('-' .repeat(50))
      criticalFindings.forEach(finding => {
        console.log(`\n❌ ${finding.title}`)
        console.log(`   Category: ${finding.category}`)
        console.log(`   Description: ${finding.description}`)
        console.log(`   Recommendation: ${finding.recommendation}`)
        if (finding.remediation) {
          console.log(`   Remediation: ${finding.remediation}`)
        }
      })
    }

    // High findings
    if (highFindings.length > 0) {
      console.log('\n🔥 HIGH PRIORITY FINDINGS')
      console.log('-' .repeat(50))
      highFindings.forEach(finding => {
        console.log(`\n⚠️ ${finding.title}`)
        console.log(`   Category: ${finding.category}`)
        console.log(`   Description: ${finding.description}`)
        console.log(`   Recommendation: ${finding.recommendation}`)
      })
    }

    // Medium findings  
    if (mediumFindings.length > 0) {
      console.log('\n🟡 MEDIUM PRIORITY FINDINGS')
      console.log('-' .repeat(50))
      mediumFindings.forEach(finding => {
        console.log(`\n📋 ${finding.title}`)
        console.log(`   Category: ${finding.category}`)
        console.log(`   Recommendation: ${finding.recommendation}`)
      })
    }

    // Security recommendations
    console.log('\n💡 SECURITY RECOMMENDATIONS')
    console.log('-' .repeat(50))
    const recommendations = this.generateSecurityRecommendations()
    recommendations.forEach(rec => {
      console.log(`   ${rec}`)
    })

    // Security score
    const maxScore = 100
    const criticalPenalty = criticalFindings.length * 25
    const highPenalty = highFindings.length * 15
    const mediumPenalty = mediumFindings.length * 10
    const lowPenalty = lowFindings.length * 5
    
    const score = Math.max(0, maxScore - criticalPenalty - highPenalty - mediumPenalty - lowPenalty)
    
    console.log('\n📊 SECURITY SCORE')
    console.log('-' .repeat(50))
    console.log(`Overall Security Score: ${score}/100`)
    
    if (score >= 90) {
      console.log('🟢 Excellent - Strong security posture')
    } else if (score >= 75) {
      console.log('🟡 Good - Minor improvements needed')  
    } else if (score >= 50) {
      console.log('🟠 Fair - Significant improvements required')
    } else {
      console.log('🔴 Poor - Critical security issues require immediate attention')
    }

    // Next steps
    console.log('\n🎯 IMMEDIATE NEXT STEPS')
    console.log('-' .repeat(50))
    if (criticalFindings.length > 0) {
      console.log('1. ⚡ Address all CRITICAL findings immediately')
      console.log('2. 🔒 Implement emergency security measures')
      console.log('3. 📞 Notify security team and stakeholders')
    }
    if (highFindings.length > 0) {
      console.log('4. 🔥 Plan remediation for HIGH priority findings')
      console.log('5. 📅 Schedule security improvements within 1 week')
    }
    console.log('6. 📋 Implement access control policy')
    console.log('7. 🔄 Schedule regular security audits')
    console.log('8. 📊 Set up continuous security monitoring')
  }

  async runFullSecurityAudit(): Promise<boolean> {
    try {
      this.log('INFO', 'Starting comprehensive database security audit...')

      // Run all audit checks
      await this.auditDatabaseConnections()
      await this.auditUserPrivileges()
      await this.auditSensitiveData()
      await this.auditAuditLogging()
      await this.checkDatabasePrivileges()

      // Generate policy document
      await this.createAccessControlPolicy()

      // Generate comprehensive report
      await this.generateSecurityReport()

      // Return overall security status
      const criticalFindings = this.findings.filter(f => f.severity === 'CRITICAL')
      return criticalFindings.length === 0

    } catch (error) {
      this.log('ERROR', `Security audit failed: ${error}`)
      return false
    } finally {
      await prisma.$disconnect()
    }
  }
}

// CLI interface
if (require.main === module) {
  const auditor = new DatabaseSecurityAuditor()
  
  auditor.runFullSecurityAudit()
    .then(passed => {
      if (passed) {
        console.log('\n✅ Security audit completed - No critical issues found')
        process.exit(0)
      } else {
        console.log('\n❌ Security audit completed - Critical issues require immediate attention')
        process.exit(1)
      }
    })
    .catch(error => {
      console.error('Security audit failed:', error)
      process.exit(1)
    })
}

export default DatabaseSecurityAuditor