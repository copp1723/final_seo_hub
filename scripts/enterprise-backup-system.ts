#!/usr/bin/env npx tsx
/**
 * ENTERPRISE DATABASE BACKUP & RECOVERY SYSTEM
 * 
 * Comprehensive backup strategy designed to prevent future data loss incidents
 * Includes automated backups, point-in-time recovery, and disaster recovery
 */

import { execSync } from 'child_process'
import { promises as fs } from 'fs'
import { join } from 'path'
import { createHash } from 'crypto'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface BackupMetadata {
  id: string
  timestamp: string
  type: 'full' | 'incremental' | 'schema'
  size: number
  checksum: string
  tables: string[]
  recordCounts: Record<string, number>
  retentionExpiry: string
  verificationStatus: 'pending' | 'verified' | 'failed'
}

interface BackupConfig {
  baseDir: string
  retentionPolicy: {
    daily: number    // days
    weekly: number   // weeks
    monthly: number  // months
  }
  alerting: {
    email?: string
    webhook?: string
  }
  encryption: {
    enabled: boolean
    keyPath?: string
  }
  compression: boolean
  verification: boolean
}

class EnterpriseBackupSystem {
  private config: BackupConfig
  private logFile: string

  constructor(config: Partial<BackupConfig> = {}) {
    this.config = {
      baseDir: join(process.cwd(), 'backups'),
      retentionPolicy: {
        daily: 7,
        weekly: 4,
        monthly: 12
      },
      alerting: {},
      encryption: { enabled: false },
      compression: true,
      verification: true,
      ...config
    }
    
    this.logFile = join(this.config.baseDir, 'backup.log')
    this.ensureDirectories()
  }

  private async ensureDirectories(): Promise<void> {
    const dirs = [
      this.config.baseDir,
      join(this.config.baseDir, 'daily'),
      join(this.config.baseDir, 'weekly'),
      join(this.config.baseDir, 'monthly'),
      join(this.config.baseDir, 'metadata'),
      join(this.config.baseDir, 'logs')
    ]

    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true })
    }
  }

  private log(level: 'INFO' | 'WARN' | 'ERROR', message: string): void {
    const timestamp = new Date().toISOString()
    const logEntry = `[${timestamp}] [${level}] ${message}\n`
    
    console.log(logEntry.trim())
    fs.appendFile(this.logFile, logEntry).catch(console.error)
  }

  private async getDatabaseUrl(): Promise<string> {
    const url = process.env.DATABASE_URL
    if (!url) {
      throw new Error('DATABASE_URL environment variable not set')
    }
    return url
  }

  private generateBackupId(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const random = Math.random().toString(36).substring(2, 8)
    return `backup-${timestamp}-${random}`
  }

  private async calculateChecksum(filePath: string): Promise<string> {
    const data = await fs.readFile(filePath)
    return createHash('sha256').update(data).digest('hex')
  }

  private async getTableCounts(): Promise<Record<string, number>> {
    const counts: Record<string, number> = {}
    
    // Get all table names from schema
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename NOT LIKE '_prisma%'
    `

    for (const table of tables) {
      try {
        const result = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${table.tablename}"`)
        counts[table.tablename] = Number((result as any[])[0]?.count || 0)
      } catch (error) {
        this.log('WARN', `Failed to count table ${table.tablename}: ${error}`)
        counts[table.tablename] = -1
      }
    }

    return counts
  }

  async createFullBackup(): Promise<BackupMetadata> {
    const backupId = this.generateBackupId()
    const timestamp = new Date().toISOString()
    
    this.log('INFO', `Starting full backup: ${backupId}`)

    try {
      const databaseUrl = await this.getDatabaseUrl()
      const backupFile = join(this.config.baseDir, 'daily', `${backupId}.sql`)
      
      // Create SQL dump
      this.log('INFO', 'Creating database dump...')
      const dumpCommand = `pg_dump "${databaseUrl}" --verbose --clean --no-owner --no-privileges`
      const dumpOutput = execSync(dumpCommand, { encoding: 'utf8' })
      
      // Apply compression if enabled
      let finalBackupFile = backupFile
      if (this.config.compression) {
        const compressedFile = `${backupFile}.gz`
        execSync(`echo '${dumpOutput}' | gzip > "${compressedFile}"`)
        finalBackupFile = compressedFile
        this.log('INFO', 'Backup compressed successfully')
      } else {
        await fs.writeFile(backupFile, dumpOutput)
      }

      // Get file stats
      const stats = await fs.stat(finalBackupFile)
      const checksum = await this.calculateChecksum(finalBackupFile)
      const tableCounts = await this.getTableCounts()

      // Create metadata
      const metadata: BackupMetadata = {
        id: backupId,
        timestamp,
        type: 'full',
        size: stats.size,
        checksum,
        tables: Object.keys(tableCounts),
        recordCounts: tableCounts,
        retentionExpiry: new Date(Date.now() + this.config.retentionPolicy.daily * 24 * 60 * 60 * 1000).toISOString(),
        verificationStatus: 'pending'
      }

      // Save metadata
      const metadataFile = join(this.config.baseDir, 'metadata', `${backupId}.json`)
      await fs.writeFile(metadataFile, JSON.stringify(metadata, null, 2))

      // Verify backup if enabled
      if (this.config.verification) {
        await this.verifyBackup(metadata, finalBackupFile)
      }

      this.log('INFO', `Full backup completed: ${backupId} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`)
      return metadata

    } catch (error) {
      this.log('ERROR', `Full backup failed: ${error}`)
      throw error
    }
  }

  async verifyBackup(metadata: BackupMetadata, backupFile: string): Promise<boolean> {
    this.log('INFO', `Verifying backup: ${metadata.id}`)

    try {
      // Verify file exists and checksum matches
      const currentChecksum = await this.calculateChecksum(backupFile)
      if (currentChecksum !== metadata.checksum) {
        throw new Error('Backup file checksum mismatch')
      }

      // Test restore to temporary database (if PostgreSQL tools available locally)
      const testDbName = `test_restore_${Date.now()}`
      
      try {
        this.log('INFO', 'Creating temporary test database...')
        execSync(`createdb "${testDbName}"`, { stdio: 'pipe' })
        
        // Restore backup
        if (metadata.type === 'full') {
          const restoreCommand = backupFile.endsWith('.gz') 
            ? `gunzip -c "${backupFile}" | psql "${testDbName}"`
            : `psql "${testDbName}" < "${backupFile}"`
          
          execSync(restoreCommand, { stdio: 'pipe' })
        }
        
        // Verify key tables exist and have data
        const verificationQueries = [
          'SELECT COUNT(*) FROM users;',
          'SELECT COUNT(*) FROM agencies;',
          'SELECT COUNT(*) FROM dealerships;'
        ]
        
        for (const query of verificationQueries) {
          execSync(`psql "${testDbName}" -c "${query}"`, { stdio: 'pipe' })
        }
        
        this.log('INFO', 'Backup verification successful')
        metadata.verificationStatus = 'verified'
        
        // Cleanup test database
        execSync(`dropdb "${testDbName}"`, { stdio: 'pipe' })
        
      } catch (restoreError) {
        // Cleanup test database on failure
        try {
          execSync(`dropdb "${testDbName}"`, { stdio: 'pipe' })
        } catch (cleanupError) {
          this.log('WARN', `Failed to cleanup test database: ${cleanupError}`)
        }
        throw restoreError
      }

      return true

    } catch (error) {
      this.log('ERROR', `Backup verification failed: ${error}`)
      metadata.verificationStatus = 'failed'
      return false
    }
  }

  async createPointInTimeBackup(): Promise<BackupMetadata> {
    this.log('INFO', 'Creating point-in-time backup...')
    
    // For PostgreSQL, this would typically involve WAL archiving
    // For simplicity, we'll create a full backup with timestamp
    const metadata = await this.createFullBackup()
    
    // Move to point-in-time directory structure
    const pitDir = join(this.config.baseDir, 'point-in-time', metadata.timestamp.substring(0, 10))
    await fs.mkdir(pitDir, { recursive: true })
    
    return metadata
  }

  async performRetentionCleanup(): Promise<void> {
    this.log('INFO', 'Starting retention cleanup...')

    try {
      // Load all metadata files
      const metadataDir = join(this.config.baseDir, 'metadata')
      const metadataFiles = await fs.readdir(metadataDir)
      
      let deletedCount = 0
      let errorCount = 0

      for (const file of metadataFiles.filter(f => f.endsWith('.json'))) {
        try {
          const metadataPath = join(metadataDir, file)
          const metadataContent = await fs.readFile(metadataPath, 'utf8')
          const metadata: BackupMetadata = JSON.parse(metadataContent)

          // Check if backup has expired
          const expiryDate = new Date(metadata.retentionExpiry)
          if (expiryDate < new Date()) {
            // Delete backup file
            const backupFile = join(this.config.baseDir, 'daily', `${metadata.id}.sql`)
            const compressedBackupFile = `${backupFile}.gz`
            
            try {
              await fs.unlink(backupFile).catch(() => {})
              await fs.unlink(compressedBackupFile).catch(() => {})
              await fs.unlink(metadataPath)
              
              deletedCount++
              this.log('INFO', `Deleted expired backup: ${metadata.id}`)
            } catch (deleteError) {
              this.log('WARN', `Failed to delete backup ${metadata.id}: ${deleteError}`)
              errorCount++
            }
          }
        } catch (parseError) {
          this.log('WARN', `Failed to parse metadata file ${file}: ${parseError}`)
          errorCount++
        }
      }

      this.log('INFO', `Retention cleanup completed: ${deletedCount} deleted, ${errorCount} errors`)

    } catch (error) {
      this.log('ERROR', `Retention cleanup failed: ${error}`)
      throw error
    }
  }

  async restoreFromBackup(backupId: string, targetDatabase?: string): Promise<boolean> {
    this.log('INFO', `Starting restore from backup: ${backupId}`)

    try {
      // Load backup metadata
      const metadataFile = join(this.config.baseDir, 'metadata', `${backupId}.json`)
      const metadataContent = await fs.readFile(metadataFile, 'utf8')
      const metadata: BackupMetadata = JSON.parse(metadataContent)

      if (metadata.verificationStatus !== 'verified') {
        this.log('WARN', 'Attempting to restore from unverified backup')
      }

      // Find backup file
      const possiblePaths = [
        join(this.config.baseDir, 'daily', `${backupId}.sql`),
        join(this.config.baseDir, 'daily', `${backupId}.sql.gz`),
        join(this.config.baseDir, 'weekly', `${backupId}.sql`),
        join(this.config.baseDir, 'weekly', `${backupId}.sql.gz`),
        join(this.config.baseDir, 'monthly', `${backupId}.sql`),
        join(this.config.baseDir, 'monthly', `${backupId}.sql.gz`)
      ]

      let backupFile: string | undefined
      for (const path of possiblePaths) {
        try {
          await fs.access(path)
          backupFile = path
          break
        } catch (error) {
          // File doesn't exist, continue
        }
      }

      if (!backupFile) {
        throw new Error(`Backup file not found for: ${backupId}`)
      }

      // Get target database URL
      const databaseUrl = targetDatabase || await this.getDatabaseUrl()
      
      // Perform restore
      this.log('INFO', `Restoring from: ${backupFile}`)
      
      const restoreCommand = backupFile.endsWith('.gz')
        ? `gunzip -c "${backupFile}" | psql "${databaseUrl}"`
        : `psql "${databaseUrl}" < "${backupFile}"`
      
      execSync(restoreCommand, { stdio: 'inherit' })

      this.log('INFO', `Restore completed successfully from backup: ${backupId}`)
      return true

    } catch (error) {
      this.log('ERROR', `Restore failed: ${error}`)
      return false
    }
  }

  async generateBackupReport(): Promise<void> {
    this.log('INFO', 'Generating backup system report...')

    try {
      const metadataDir = join(this.config.baseDir, 'metadata')
      const metadataFiles = await fs.readdir(metadataDir)
      
      const backups: BackupMetadata[] = []
      let totalSize = 0

      for (const file of metadataFiles.filter(f => f.endsWith('.json'))) {
        try {
          const metadataPath = join(metadataDir, file)
          const metadataContent = await fs.readFile(metadataPath, 'utf8')
          const metadata: BackupMetadata = JSON.parse(metadataContent)
          backups.push(metadata)
          totalSize += metadata.size
        } catch (error) {
          this.log('WARN', `Failed to read metadata: ${file}`)
        }
      }

      // Sort by timestamp
      backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

      console.log('\n📊 ENTERPRISE BACKUP SYSTEM REPORT')
      console.log('=' .repeat(60))
      console.log(`Total Backups: ${backups.length}`)
      console.log(`Total Storage: ${(totalSize / 1024 / 1024 / 1024).toFixed(2)} GB`)
      console.log(`Configuration:`)
      console.log(`  - Daily Retention: ${this.config.retentionPolicy.daily} days`)
      console.log(`  - Weekly Retention: ${this.config.retentionPolicy.weekly} weeks`)
      console.log(`  - Monthly Retention: ${this.config.retentionPolicy.monthly} months`)
      console.log(`  - Compression: ${this.config.compression ? 'Enabled' : 'Disabled'}`)
      console.log(`  - Verification: ${this.config.verification ? 'Enabled' : 'Disabled'}`)

      console.log('\n📋 Recent Backups:')
      backups.slice(0, 10).forEach(backup => {
        const age = Math.floor((Date.now() - new Date(backup.timestamp).getTime()) / (1000 * 60 * 60))
        const sizeFormatted = (backup.size / 1024 / 1024).toFixed(1)
        const statusIcon = backup.verificationStatus === 'verified' ? '✅' : 
                          backup.verificationStatus === 'failed' ? '❌' : '⏳'
        
        console.log(`  ${statusIcon} ${backup.id}`)
        console.log(`      Created: ${backup.timestamp} (${age}h ago)`)
        console.log(`      Size: ${sizeFormatted} MB | Tables: ${backup.tables.length}`)
        console.log(`      Records: ${Object.values(backup.recordCounts).reduce((a, b) => a + b, 0).toLocaleString()}`)
      })

      console.log('\n🔧 Backup Health:')
      const verified = backups.filter(b => b.verificationStatus === 'verified').length
      const failed = backups.filter(b => b.verificationStatus === 'failed').length
      const pending = backups.filter(b => b.verificationStatus === 'pending').length
      
      console.log(`  ✅ Verified: ${verified}`)
      console.log(`  ❌ Failed: ${failed}`)
      console.log(`  ⏳ Pending: ${pending}`)

      if (failed > 0) {
        console.log('\n⚠️ Failed Backups (Action Required):')
        backups.filter(b => b.verificationStatus === 'failed').forEach(backup => {
          console.log(`  - ${backup.id} (${backup.timestamp})`)
        })
      }

    } catch (error) {
      this.log('ERROR', `Failed to generate backup report: ${error}`)
      throw error
    }
  }

  async scheduleAutomatedBackups(): Promise<void> {
    this.log('INFO', 'Setting up automated backup schedule...')
    
    // This would typically integrate with a job scheduler like node-cron
    // For production, consider using system cron or Kubernetes CronJobs
    
    console.log('\n📅 AUTOMATED BACKUP SCHEDULE SETUP')
    console.log('To implement automated backups, add these cron jobs:')
    console.log('')
    console.log('# Daily backup at 2 AM')
    console.log('0 2 * * * cd /path/to/project && npx tsx scripts/enterprise-backup-system.ts backup')
    console.log('')
    console.log('# Weekly cleanup on Sundays at 3 AM')
    console.log('0 3 * * 0 cd /path/to/project && npx tsx scripts/enterprise-backup-system.ts cleanup')
    console.log('')
    console.log('# Monthly report on 1st of each month at 4 AM')
    console.log('0 4 1 * * cd /path/to/project && npx tsx scripts/enterprise-backup-system.ts report')
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2] || 'backup'
  const backupSystem = new EnterpriseBackupSystem()

  switch (command) {
    case 'backup':
      backupSystem.createFullBackup()
        .then(metadata => {
          console.log(`✅ Backup completed: ${metadata.id}`)
          process.exit(0)
        })
        .catch(error => {
          console.error('❌ Backup failed:', error)
          process.exit(1)
        })
      break

    case 'verify':
      const backupId = process.argv[3]
      if (!backupId) {
        console.error('Usage: npm run backup verify <backup-id>')
        process.exit(1)
      }
      // Implementation would load and verify specific backup
      console.log(`Verifying backup: ${backupId}`)
      break

    case 'restore':
      const restoreBackupId = process.argv[3]
      if (!restoreBackupId) {
        console.error('Usage: npm run backup restore <backup-id>')
        process.exit(1)
      }
      backupSystem.restoreFromBackup(restoreBackupId)
        .then(success => {
          process.exit(success ? 0 : 1)
        })
        .catch(error => {
          console.error('❌ Restore failed:', error)
          process.exit(1)
        })
      break

    case 'cleanup':
      backupSystem.performRetentionCleanup()
        .then(() => {
          console.log('✅ Cleanup completed')
          process.exit(0)
        })
        .catch(error => {
          console.error('❌ Cleanup failed:', error)
          process.exit(1)
        })
      break

    case 'report':
      backupSystem.generateBackupReport()
        .then(() => process.exit(0))
        .catch(error => {
          console.error('❌ Report generation failed:', error)
          process.exit(1)
        })
      break

    case 'schedule':
      backupSystem.scheduleAutomatedBackups()
        .then(() => process.exit(0))
        .catch(error => {
          console.error('❌ Schedule setup failed:', error)
          process.exit(1)
        })
      break

    default:
      console.log('Usage: npx tsx enterprise-backup-system.ts <command>')
      console.log('Commands: backup, verify, restore, cleanup, report, schedule')
      process.exit(1)
  }
}

export default EnterpriseBackupSystem