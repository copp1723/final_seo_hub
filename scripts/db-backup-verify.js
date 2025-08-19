#!/usr/bin/env node

/**
 * Database Backup Verification Script
 * 
 * This script ensures database backups are valid and complete before allowing
 * any destructive database operations. Created in response to the database
 * wipe incident.
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const BACKUP_DIR = path.join(process.cwd(), 'backups')
const LOG_FILE = path.join(BACKUP_DIR, 'backup-verification.log')

class DatabaseBackupVerifier {
  constructor() {
    this.databaseUrl = process.env.DATABASE_URL
    if (!this.databaseUrl) {
      throw new Error('DATABASE_URL environment variable is required')
    }
    
    // Ensure backup directory exists
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true })
    }
  }

  log(message) {
    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] ${message}\n`
    console.log(logMessage.trim())
    fs.appendFileSync(LOG_FILE, logMessage)
  }

  async createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFile = path.join(BACKUP_DIR, `backup-${timestamp}.sql`)
    
    try {
      this.log(`Creating database backup: ${backupFile}`)
      
      // Create SQL dump
      const command = `pg_dump "${this.databaseUrl}" > "${backupFile}"`
      execSync(command, { stdio: 'pipe' })
      
      // Verify backup file was created and has content
      const stats = fs.statSync(backupFile)
      if (stats.size === 0) {
        throw new Error('Backup file is empty')
      }
      
      this.log(`Backup created successfully: ${backupFile} (${stats.size} bytes)`)
      return backupFile
      
    } catch (error) {
      this.log(`BACKUP FAILED: ${error.message}`)
      throw error
    }
  }

  async verifyBackup(backupFile) {
    try {
      this.log(`Verifying backup: ${backupFile}`)
      
      // Check if backup file exists and is readable
      if (!fs.existsSync(backupFile)) {
        throw new Error(`Backup file does not exist: ${backupFile}`)
      }
      
      const backupContent = fs.readFileSync(backupFile, 'utf8')
      
      // Verify backup contains essential tables
      const requiredTables = [
        'users', 'agencies', 'dealerships', 
        'ga4_connections', 'search_console_connections'
      ]
      
      const missingTables = []
      for (const table of requiredTables) {
        if (!backupContent.includes(`CREATE TABLE public.${table}`) && 
            !backupContent.includes(`"${table}"`)) {
          missingTables.push(table)
        }
      }
      
      if (missingTables.length > 0) {
        throw new Error(`Backup missing critical tables: ${missingTables.join(', ')}`)
      }
      
      // Verify backup contains data (not just schema)
      const hasInserts = backupContent.includes('INSERT INTO') || 
                        backupContent.includes('COPY ')
      
      if (!hasInserts) {
        this.log('WARNING: Backup appears to contain schema only, no data found')
      }
      
      this.log(`Backup verification successful: ${backupFile}`)
      return true
      
    } catch (error) {
      this.log(`BACKUP VERIFICATION FAILED: ${error.message}`)
      throw error
    }
  }

  async testRestore(backupFile) {
    const testDbName = `test_restore_${Date.now()}`
    
    try {
      this.log(`Testing restore with temporary database: ${testDbName}`)
      
      // Create temporary test database
      const createDbCmd = `createdb "${testDbName}"`
      execSync(createDbCmd, { stdio: 'pipe' })
      
      // Restore backup to test database
      const restoreCmd = `psql "${testDbName}" < "${backupFile}"`
      execSync(restoreCmd, { stdio: 'pipe' })
      
      // Verify basic table structure
      const testCmd = `psql "${testDbName}" -c "SELECT COUNT(*) FROM users;"`
      execSync(testCmd, { stdio: 'pipe' })
      
      this.log(`Restore test successful for: ${backupFile}`)
      
      // Cleanup test database
      const dropDbCmd = `dropdb "${testDbName}"`
      execSync(dropDbCmd, { stdio: 'pipe' })
      
      return true
      
    } catch (error) {
      // Attempt cleanup on failure
      try {
        const dropDbCmd = `dropdb "${testDbName}"`
        execSync(dropDbCmd, { stdio: 'pipe' })
      } catch (cleanupError) {
        this.log(`Warning: Failed to cleanup test database: ${cleanupError.message}`)
      }
      
      this.log(`RESTORE TEST FAILED: ${error.message}`)
      throw error
    }
  }

  async verifyMigrationSafety() {
    try {
      this.log('Verifying migration safety...')
      
      // Check if this is a destructive migration
      const migrationFiles = fs.readdirSync('prisma/migrations').filter(f => f.endsWith('.sql'))
      const latestMigration = migrationFiles[migrationFiles.length - 1]
      
      if (latestMigration) {
        const migrationPath = path.join('prisma/migrations', latestMigration)
        const migrationContent = fs.readFileSync(migrationPath, 'utf8').toLowerCase()
        
        const destructiveOperations = [
          'drop table', 'drop column', 'drop database', 
          'delete from', 'truncate', 'alter table drop'
        ]
        
        for (const operation of destructiveOperations) {
          if (migrationContent.includes(operation)) {
            this.log(`WARNING: Potentially destructive migration detected: ${operation}`)
            return false
          }
        }
      }
      
      this.log('Migration safety verification passed')
      return true
      
    } catch (error) {
      this.log(`Migration safety check failed: ${error.message}`)
      return false
    }
  }

  async fullVerificationSequence() {
    try {
      this.log('=== STARTING FULL DATABASE BACKUP VERIFICATION ===')
      
      // Step 1: Create backup
      const backupFile = await this.createBackup()
      
      // Step 2: Verify backup integrity
      await this.verifyBackup(backupFile)
      
      // Step 3: Test restore capability
      await this.testRestore(backupFile)
      
      // Step 4: Verify migration safety
      const migrationSafe = await this.verifyMigrationSafety()
      
      if (!migrationSafe) {
        throw new Error('Migration contains potentially destructive operations')
      }
      
      this.log('=== BACKUP VERIFICATION COMPLETED SUCCESSFULLY ===')
      this.log(`Verified backup location: ${backupFile}`)
      
      return {
        success: true,
        backupFile,
        verifiedAt: new Date().toISOString()
      }
      
    } catch (error) {
      this.log(`=== BACKUP VERIFICATION FAILED ===`)
      this.log(`Error: ${error.message}`)
      
      return {
        success: false,
        error: error.message,
        failedAt: new Date().toISOString()
      }
    }
  }
}

// CLI usage
if (require.main === module) {
  const verifier = new DatabaseBackupVerifier()
  
  const command = process.argv[2] || 'full'
  
  switch (command) {
    case 'backup':
      verifier.createBackup().catch(console.error)
      break
    case 'verify':
      const backupFile = process.argv[3]
      if (!backupFile) {
        console.error('Please provide backup file path')
        process.exit(1)
      }
      verifier.verifyBackup(backupFile).catch(console.error)
      break
    case 'full':
    default:
      verifier.fullVerificationSequence()
        .then(result => {
          if (!result.success) {
            process.exit(1)
          }
        })
        .catch(console.error)
      break
  }
}

module.exports = DatabaseBackupVerifier