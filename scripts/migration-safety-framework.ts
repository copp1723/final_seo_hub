#!/usr/bin/env npx tsx
/**
 * MIGRATION SAFETY FRAMEWORK
 * 
 * Comprehensive safety system to prevent accidental data loss during migrations
 * Includes pre-migration validation, automatic backups, and rollback capabilities
 */

import { execSync } from 'child_process'
import { promises as fs } from 'fs'
import { join } from 'path'
import { PrismaClient } from '@prisma/client'
import EnterpriseBackupSystem from './enterprise-backup-system'

const prisma = new PrismaClient()

interface MigrationMetadata {
  id: string
  timestamp: string
  description: string
  sqlContent: string
  destructiveOperations: string[]
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  preBackupId?: string
  rollbackScript?: string
  appliedAt?: string
  rolledBackAt?: string
}

interface SafetyCheck {
  name: string
  passed: boolean
  warning?: string
  error?: string
  recommendation?: string
}

class MigrationSafetyFramework {
  private backupSystem: EnterpriseBackupSystem
  private logFile: string

  constructor() {
    this.backupSystem = new EnterpriseBackupSystem()
    this.logFile = join(process.cwd(), 'logs', 'migration-safety.log')
    this.ensureLogDirectory()
  }

  private async ensureLogDirectory(): Promise<void> {
    await fs.mkdir(join(process.cwd(), 'logs'), { recursive: true })
  }

  private log(level: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL', message: string): void {
    const timestamp = new Date().toISOString()
    const logEntry = `[${timestamp}] [${level}] ${message}\n`
    
    console.log(logEntry.trim())
    fs.appendFile(this.logFile, logEntry).catch(console.error)
  }

  async analyzeMigrationRisk(sqlContent: string): Promise<MigrationMetadata> {
    this.log('INFO', 'Analyzing migration risk...')

    const destructiveOperations: string[] = []
    const sqlLower = sqlContent.toLowerCase()

    // Define destructive operation patterns
    const destructivePatterns = [
      { pattern: /drop\s+table/gi, operation: 'DROP TABLE' },
      { pattern: /drop\s+column/gi, operation: 'DROP COLUMN' },
      { pattern: /drop\s+database/gi, operation: 'DROP DATABASE' },
      { pattern: /truncate\s+table/gi, operation: 'TRUNCATE TABLE' },
      { pattern: /delete\s+from/gi, operation: 'DELETE FROM' },
      { pattern: /alter\s+table\s+\w+\s+drop/gi, operation: 'ALTER TABLE DROP' },
      { pattern: /drop\s+index/gi, operation: 'DROP INDEX' },
      { pattern: /drop\s+constraint/gi, operation: 'DROP CONSTRAINT' },
      { pattern: /alter\s+column\s+\w+\s+drop/gi, operation: 'ALTER COLUMN DROP' },
      { pattern: /rename\s+table/gi, operation: 'RENAME TABLE' },
      { pattern: /alter\s+table\s+\w+\s+rename/gi, operation: 'RENAME COLUMN' }
    ]

    // Check for destructive operations
    for (const { pattern, operation } of destructivePatterns) {
      const matches = sqlContent.match(pattern)
      if (matches) {
        destructiveOperations.push(...matches.map(() => operation))
      }
    }

    // Determine risk level
    let riskLevel: MigrationMetadata['riskLevel'] = 'LOW'
    
    if (destructiveOperations.length > 0) {
      const criticalOps = destructiveOperations.filter(op => 
        ['DROP TABLE', 'DROP DATABASE', 'TRUNCATE TABLE'].includes(op)
      )
      const highRiskOps = destructiveOperations.filter(op => 
        ['DELETE FROM', 'DROP COLUMN', 'ALTER TABLE DROP'].includes(op)
      )
      
      if (criticalOps.length > 0) {
        riskLevel = 'CRITICAL'
      } else if (highRiskOps.length > 0) {
        riskLevel = 'HIGH'
      } else {
        riskLevel = 'MEDIUM'
      }
    }

    const metadata: MigrationMetadata = {
      id: `migration-${Date.now()}`,
      timestamp: new Date().toISOString(),
      description: this.extractMigrationDescription(sqlContent),
      sqlContent,
      destructiveOperations,
      riskLevel
    }

    this.log('INFO', `Migration risk analysis complete: ${riskLevel} risk level`)
    return metadata
  }

  private extractMigrationDescription(sqlContent: string): string {
    // Try to extract description from comments
    const commentMatch = sqlContent.match(/--\s*(.+)/i)
    if (commentMatch) {
      return commentMatch[1].trim()
    }

    // Fallback to first significant SQL statement
    const statements = sqlContent.split(';').filter(s => s.trim())
    if (statements.length > 0) {
      return statements[0].trim().substring(0, 100) + '...'
    }

    return 'No description available'
  }

  async performPreMigrationChecks(): Promise<SafetyCheck[]> {
    this.log('INFO', 'Performing pre-migration safety checks...')

    const checks: SafetyCheck[] = []

    // Check 1: Database connectivity
    try {
      await prisma.$queryRaw`SELECT 1`
      checks.push({
        name: 'Database Connectivity',
        passed: true
      })
    } catch (error) {
      checks.push({
        name: 'Database Connectivity',
        passed: false,
        error: 'Failed to connect to database',
        recommendation: 'Verify DATABASE_URL and database availability'
      })
    }

    // Check 2: Active connections
    try {
      const connections = await prisma.$queryRaw<Array<{ count: number }>>`
        SELECT COUNT(*) as count FROM pg_stat_activity 
        WHERE state = 'active' AND pid != pg_backend_pid()
      `
      const activeConnections = Number(connections[0]?.count || 0)
      
      if (activeConnections > 10) {
        checks.push({
          name: 'Active Connections',
          passed: false,
          warning: `${activeConnections} active connections detected`,
          recommendation: 'Consider running migration during low-traffic period'
        })
      } else {
        checks.push({
          name: 'Active Connections',
          passed: true
        })
      }
    } catch (error) {
      checks.push({
        name: 'Active Connections',
        passed: false,
        error: 'Failed to check active connections'
      })
    }

    // Check 3: Disk space
    try {
      const diskUsage = await prisma.$queryRaw<Array<{ size: string }>>`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `
      checks.push({
        name: 'Database Size',
        passed: true,
        warning: `Current database size: ${diskUsage[0]?.size || 'Unknown'}`
      })
    } catch (error) {
      checks.push({
        name: 'Database Size',
        passed: false,
        error: 'Failed to check database size'
      })
    }

    // Check 4: Recent backup availability
    try {
      const backupDir = join(process.cwd(), 'backups', 'metadata')
      const metadataFiles = await fs.readdir(backupDir).catch(() => [])
      
      if (metadataFiles.length === 0) {
        checks.push({
          name: 'Recent Backup',
          passed: false,
          error: 'No backups found',
          recommendation: 'Create a backup before proceeding with migration'
        })
      } else {
        // Check for recent backup (within last 24 hours)
        const recentBackups = []
        for (const file of metadataFiles.filter(f => f.endsWith('.json'))) {
          try {
            const metadataPath = join(backupDir, file)
            const content = await fs.readFile(metadataPath, 'utf8')
            const metadata = JSON.parse(content)
            const backupAge = Date.now() - new Date(metadata.timestamp).getTime()
            if (backupAge < 24 * 60 * 60 * 1000) { // 24 hours
              recentBackups.push(metadata)
            }
          } catch (error) {
            // Skip invalid metadata files
          }
        }

        if (recentBackups.length === 0) {
          checks.push({
            name: 'Recent Backup',
            passed: false,
            warning: 'No backups found within last 24 hours',
            recommendation: 'Create a fresh backup before migration'
          })
        } else {
          checks.push({
            name: 'Recent Backup',
            passed: true,
            warning: `${recentBackups.length} recent backup(s) available`
          })
        }
      }
    } catch (error) {
      checks.push({
        name: 'Recent Backup',
        passed: false,
        error: 'Failed to check backup status'
      })
    }

    // Check 5: Migration drift
    try {
      // Check if schema is in sync with migrations
      await execSync('npx prisma migrate status', { stdio: 'pipe' })
      checks.push({
        name: 'Migration Status',
        passed: true
      })
    } catch (error) {
      checks.push({
        name: 'Migration Status',
        passed: false,
        error: 'Migration drift detected',
        recommendation: 'Resolve migration conflicts before proceeding'
      })
    }

    return checks
  }

  async createPreMigrationBackup(): Promise<string> {
    this.log('INFO', 'Creating pre-migration backup...')
    
    try {
      const metadata = await this.backupSystem.createFullBackup()
      this.log('INFO', `Pre-migration backup created: ${metadata.id}`)
      return metadata.id
    } catch (error) {
      this.log('ERROR', `Failed to create pre-migration backup: ${error}`)
      throw error
    }
  }

  generateRollbackScript(migrationContent: string): string {
    this.log('INFO', 'Generating rollback script...')

    const statements = migrationContent.split(';').filter(s => s.trim())
    const rollbackStatements: string[] = []

    for (const statement of statements) {
      const trimmed = statement.trim()
      
      // Generate rollback for common operations
      if (trimmed.match(/CREATE TABLE\s+(\w+)/i)) {
        const match = trimmed.match(/CREATE TABLE\s+(\w+)/i)
        if (match) {
          rollbackStatements.push(`DROP TABLE IF EXISTS ${match[1]} CASCADE`)
        }
      } else if (trimmed.match(/ALTER TABLE\s+(\w+)\s+ADD COLUMN\s+(\w+)/i)) {
        const match = trimmed.match(/ALTER TABLE\s+(\w+)\s+ADD COLUMN\s+(\w+)/i)
        if (match) {
          rollbackStatements.push(`ALTER TABLE ${match[1]} DROP COLUMN IF EXISTS ${match[2]}`)
        }
      } else if (trimmed.match(/CREATE INDEX\s+(\w+)/i)) {
        const match = trimmed.match(/CREATE INDEX\s+(\w+)/i)
        if (match) {
          rollbackStatements.push(`DROP INDEX IF EXISTS ${match[1]}`)
        }
      }
      // Add more rollback patterns as needed
    }

    const rollbackScript = rollbackStatements.length > 0 
      ? `-- Rollback script generated on ${new Date().toISOString()}\n\n${rollbackStatements.join(';\n')};`
      : '-- No automatic rollback available for this migration'

    this.log('INFO', `Generated rollback script with ${rollbackStatements.length} statements`)
    return rollbackScript
  }

  async executeSafeMigration(migrationFile: string): Promise<boolean> {
    this.log('INFO', `Starting safe migration execution: ${migrationFile}`)

    try {
      // Read migration content
      const migrationContent = await fs.readFile(migrationFile, 'utf8')
      
      // Analyze migration risk
      const metadata = await this.analyzeMigrationRisk(migrationContent)
      
      // Display risk assessment
      console.log('\n🔍 MIGRATION RISK ASSESSMENT')
      console.log('=' .repeat(50))
      console.log(`Migration: ${metadata.description}`)
      console.log(`Risk Level: ${this.getRiskIcon(metadata.riskLevel)} ${metadata.riskLevel}`)
      console.log(`Destructive Operations: ${metadata.destructiveOperations.length}`)
      
      if (metadata.destructiveOperations.length > 0) {
        console.log(`Operations: ${metadata.destructiveOperations.join(', ')}`)
      }

      // Perform pre-migration checks
      const checks = await this.performPreMigrationChecks()
      
      console.log('\n✅ PRE-MIGRATION CHECKS')
      console.log('=' .repeat(50))
      
      let hasFailures = false
      for (const check of checks) {
        const icon = check.passed ? '✅' : '❌'
        console.log(`${icon} ${check.name}`)
        
        if (check.warning) {
          console.log(`   ⚠️ ${check.warning}`)
        }
        if (check.error) {
          console.log(`   ❌ ${check.error}`)
          hasFailures = true
        }
        if (check.recommendation) {
          console.log(`   💡 ${check.recommendation}`)
        }
      }

      // Stop if critical failures
      if (hasFailures) {
        this.log('ERROR', 'Pre-migration checks failed')
        return false
      }

      // Create backup for high-risk migrations
      if (['HIGH', 'CRITICAL'].includes(metadata.riskLevel)) {
        console.log('\n💾 Creating pre-migration backup...')
        metadata.preBackupId = await this.createPreMigrationBackup()
        console.log(`✅ Backup created: ${metadata.preBackupId}`)
      }

      // Generate rollback script
      metadata.rollbackScript = this.generateRollbackScript(migrationContent)

      // Confirm execution for high-risk migrations
      if (metadata.riskLevel === 'CRITICAL') {
        console.log('\n⚠️ CRITICAL RISK MIGRATION DETECTED')
        console.log('This migration contains potentially destructive operations.')
        console.log('Automatic execution is disabled for critical risk migrations.')
        console.log('\nTo proceed manually:')
        console.log('1. Review the migration carefully')
        console.log('2. Ensure you have recent backups')
        console.log('3. Run during maintenance window')
        console.log('4. Execute: npx prisma migrate deploy')
        return false
      }

      // Execute migration
      console.log('\n🚀 Executing migration...')
      execSync('npx prisma migrate deploy', { stdio: 'inherit' })
      
      metadata.appliedAt = new Date().toISOString()
      
      // Save migration metadata
      const metadataFile = join(process.cwd(), 'logs', `migration-${metadata.id}.json`)
      await fs.writeFile(metadataFile, JSON.stringify(metadata, null, 2))

      this.log('INFO', 'Migration completed successfully')
      console.log('\n✅ Migration completed successfully!')
      
      if (metadata.preBackupId) {
        console.log(`📁 Pre-migration backup: ${metadata.preBackupId}`)
      }

      return true

    } catch (error) {
      this.log('ERROR', `Migration failed: ${error}`)
      console.error('\n❌ Migration failed:', error)
      return false
    }
  }

  private getRiskIcon(riskLevel: string): string {
    switch (riskLevel) {
      case 'LOW': return '🟢'
      case 'MEDIUM': return '🟡'
      case 'HIGH': return '🟠'
      case 'CRITICAL': return '🔴'
      default: return '⚪'
    }
  }

  async createMigrationSafetyWrappers(): Promise<void> {
    this.log('INFO', 'Creating migration safety wrappers...')

    // Create safe migrate script
    const safeMigrateScript = `#!/bin/bash
# Safe Migration Wrapper
# Automatically runs pre-migration checks and creates backups

echo "🛡️ Safe Migration Framework"
echo "=========================="

# Run safety framework
npx tsx scripts/migration-safety-framework.ts check

if [ $? -ne 0 ]; then
  echo "❌ Pre-migration checks failed"
  exit 1
fi

# Proceed with migration
echo "✅ Proceeding with migration..."
npx tsx scripts/migration-safety-framework.ts migrate

echo "✅ Migration completed"
`

    const safeMigrateScriptPath = join(process.cwd(), 'scripts', 'safe-migrate.sh')
    await fs.writeFile(safeMigrateScriptPath, safeMigrateScript)
    
    // Make executable
    execSync(`chmod +x "${safeMigrateScriptPath}"`)

    // Create package.json scripts
    console.log('\n📦 Add these scripts to your package.json:')
    console.log(`
{
  "scripts": {
    "migrate:safe": "npx tsx scripts/migration-safety-framework.ts migrate",
    "migrate:check": "npx tsx scripts/migration-safety-framework.ts check",
    "migrate:rollback": "npx tsx scripts/migration-safety-framework.ts rollback"
  }
}`)

    this.log('INFO', 'Migration safety wrappers created')
  }

  async generateMigrationPolicyDocument(): Promise<void> {
    const policy = `# DATABASE MIGRATION SAFETY POLICY

## Overview
This document establishes mandatory safety procedures for all database migrations to prevent data loss incidents.

## Risk Classification

### 🟢 LOW RISK
- Adding new tables
- Adding new columns (nullable)
- Creating indexes
- Adding constraints (non-breaking)

### 🟡 MEDIUM RISK  
- Modifying column types (compatible)
- Renaming columns/tables
- Adding NOT NULL constraints
- Dropping indexes

### 🟠 HIGH RISK
- Dropping columns
- Modifying column types (incompatible)
- Adding unique constraints
- Complex data transformations

### 🔴 CRITICAL RISK
- Dropping tables
- Truncating tables
- Bulk delete operations
- Dropping databases

## Mandatory Procedures

### All Migrations
1. ✅ Run pre-migration safety checks
2. ✅ Verify schema drift status
3. ✅ Check active connections
4. ✅ Validate migration syntax

### Medium+ Risk Migrations
1. ✅ Create pre-migration backup
2. ✅ Generate rollback script
3. ✅ Test in staging environment
4. ✅ Schedule during maintenance window

### High+ Risk Migrations
1. ✅ Stakeholder approval required
2. ✅ Document rollback procedure
3. ✅ Monitor during execution
4. ✅ Verify data integrity post-migration

### Critical Risk Migrations
1. ✅ Management approval required
2. ✅ Manual execution only
3. ✅ Real-time monitoring
4. ✅ Immediate rollback capability

## Forbidden Operations

❌ Never run migrations containing:
- \`DROP DATABASE\`
- \`TRUNCATE TABLE\` without backup
- \`DELETE FROM\` without WHERE clause
- Unreviewed SQL scripts

## Emergency Procedures

### If Migration Fails
1. 🛑 Stop all related services
2. 📋 Document error details
3. 🔄 Execute rollback procedure
4. 📞 Escalate to senior team

### If Data Loss Detected
1. 🚨 Immediate incident response
2. 🔄 Restore from latest backup
3. 📊 Assess data loss scope
4. 📝 Post-incident review

## Tools and Commands

### Safety Framework
\`\`\`bash
# Check migration safety
npm run migrate:check

# Safe migration execution
npm run migrate:safe

# Emergency rollback
npm run migrate:rollback <backup-id>
\`\`\`

### Backup Commands
\`\`\`bash
# Create backup
npx tsx scripts/enterprise-backup-system.ts backup

# Verify backup
npx tsx scripts/enterprise-backup-system.ts verify <backup-id>

# Restore backup
npx tsx scripts/enterprise-backup-system.ts restore <backup-id>
\`\`\`

## Enforcement

This policy is enforced through:
- Automated pre-migration checks
- Risk-based execution controls
- Mandatory backup creation
- Audit logging and monitoring

**Non-compliance may result in automatic migration blocking.**`

    const policyPath = join(process.cwd(), 'MIGRATION_SAFETY_POLICY.md')
    await fs.writeFile(policyPath, policy)
    
    console.log(`📋 Migration safety policy created: ${policyPath}`)
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2] || 'check'
  const framework = new MigrationSafetyFramework()

  switch (command) {
    case 'check':
      framework.performPreMigrationChecks()
        .then(checks => {
          const failed = checks.filter(c => !c.passed)
          if (failed.length > 0) {
            console.log(`❌ ${failed.length} safety checks failed`)
            process.exit(1)
          } else {
            console.log('✅ All safety checks passed')
            process.exit(0)
          }
        })
        .catch(error => {
          console.error('❌ Safety check failed:', error)
          process.exit(1)
        })
      break

    case 'migrate':
      const migrationFile = process.argv[3] || 'prisma/migrations'
      framework.executeSafeMigration(migrationFile)
        .then(success => {
          process.exit(success ? 0 : 1)
        })
        .catch(error => {
          console.error('❌ Migration failed:', error)
          process.exit(1)
        })
      break

    case 'setup':
      Promise.all([
        framework.createMigrationSafetyWrappers(),
        framework.generateMigrationPolicyDocument()
      ])
        .then(() => {
          console.log('✅ Migration safety framework setup complete')
          process.exit(0)
        })
        .catch(error => {
          console.error('❌ Setup failed:', error)
          process.exit(1)
        })
      break

    case 'rollback':
      const backupId = process.argv[3]
      if (!backupId) {
        console.error('Usage: npm run migrate:rollback <backup-id>')
        process.exit(1)
      }
      
      const backupSystem = new EnterpriseBackupSystem()
      backupSystem.restoreFromBackup(backupId)
        .then(success => {
          process.exit(success ? 0 : 1)
        })
        .catch(error => {
          console.error('❌ Rollback failed:', error)
          process.exit(1)
        })
      break

    default:
      console.log('Usage: npx tsx migration-safety-framework.ts <command>')
      console.log('Commands: check, migrate, setup, rollback')
      process.exit(1)
  }
}

export default MigrationSafetyFramework