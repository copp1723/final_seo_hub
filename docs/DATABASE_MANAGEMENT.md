# Database Management Guide

This guide provides detailed information about database management for the Rylie SEO Hub platform, including schema design, migrations, optimization, and maintenance procedures.

## Table of Contents

- [Overview](#overview)
- [Database Schema](#database-schema)
- [Prisma ORM](#prisma-orm)
- [Migrations](#migrations)
  - [Creating Migrations](#creating-migrations)
  - [Applying Migrations](#applying-migrations)
  - [Migration Troubleshooting](#migration-troubleshooting)
- [Performance Optimization](#performance-optimization)
  - [Indexes](#indexes)
  - [Query Optimization](#query-optimization)
  - [Connection Pooling](#connection-pooling)
- [Backup and Recovery](#backup-and-recovery)
- [Multi-Tenant Considerations](#multi-tenant-considerations)
- [Data Access Patterns](#data-access-patterns)
- [Advanced Operations](#advanced-operations)
  - [Manual Schema Adjustments](#manual-schema-adjustments)
  - [Data Seeding](#data-seeding)
  - [Bulk Operations](#bulk-operations)
- [Maintenance Procedures](#maintenance-procedures)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)

## Overview

The Rylie SEO Hub platform uses PostgreSQL as its primary database with Prisma ORM for database access and migrations. This combination provides:

- Strong data consistency and reliability
- Typed and secure database access
- Automated migration management
- Multi-tenant data isolation

## Database Schema

The database schema is defined in `prisma/schema.prisma` and includes the following core models:

### Core Models

- **User**: User accounts and authentication
- **Account**: OAuth provider accounts (for NextAuth)
- **Session**: User sessions
- **Agency**: Multi-tenant agency organization
- **Request**: SEO request tracking
- **Task**: Individual tasks within requests
- **GA4Connection**: Google Analytics 4 integration
- **SearchConsoleConnection**: Search Console integration
- **MonthlyUsage**: Historical package usage tracking
- **AuditLog**: Security and compliance auditing
- **SystemSettings**: Global platform configuration

### Key Relationships

- Users belong to Agencies (optional)
- Requests belong to Users and optionally to Agencies
- Tasks belong to Requests
- GA4Connection and SearchConsoleConnection belong to Users
- MonthlyUsage tracks historical usage for Users

## Prisma ORM

The platform uses Prisma ORM to interact with the database. Prisma provides:

- Type-safe database access
- Automatic query building
- Relation handling
- Migration management

### Core Prisma Files

- `prisma/schema.prisma`: Database schema definition
- `prisma/migrations/`: Migration history
- `lib/db.ts`: Prisma client instance

### Prisma Client Setup

The Prisma client is initialized in `lib/db.ts`:

```typescript
// lib/db.ts
import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
```

This setup ensures that:
- In development, a single Prisma instance is shared across hot reloads
- In production, each server instance manages its own connection pool

## Migrations

Prisma manages database migrations, ensuring safe schema evolution over time.

### Creating Migrations

To create a new migration when you change the schema:

```bash
# Development environment
npm run db:migrate:dev -- --name descriptive_migration_name

# This runs:
# prisma migrate dev --name descriptive_migration_name
```

This command:
1. Compares your current schema to the database
2. Creates a migration file in `prisma/migrations/`
3. Applies the migration to your development database
4. Regenerates the Prisma client

### Applying Migrations

To apply migrations in production:

```bash
# Production environment
npm run db:migrate

# This runs:
# prisma migrate deploy
```

This command:
1. Applies all pending migrations
2. Does not create new migrations
3. Runs in non-interactive mode (suitable for CI/CD)

### Migration Troubleshooting

#### Reset Development Database

If you encounter issues in development, you can reset the database:

```bash
npm run db:migrate:reset

# This runs:
# prisma migrate reset --force
```

This command:
1. Drops all tables
2. Recreates the schema
3. Applies all migrations
4. Seeds the database (if configured)

#### Fixing Migration Conflicts

If you encounter conflicts between local and deployed migrations:

1. Check your migration history:
   ```bash
   npx prisma migrate status
   ```

2. If necessary, resolve conflicts by:
   - Creating a new migration that resolves the differences
   - In extreme cases, using `prisma db push` to force schema changes

#### Handling Production Migration Failures

If a production migration fails:

1. Check the error messages
2. Test the migration in a staging environment
3. Consider creating a corrective migration
4. In emergencies, use manual SQL (as a last resort)

## Performance Optimization

### Indexes

The schema includes strategic indexes for common query patterns:

```prisma
model Request {
  // Fields...
  
  @@index([userId, status])
  @@index([agencyId, status])
  @@index([status, createdAt])
  @@index([seoworksTaskId])
}
```

Guidelines for indexes:
- Add indexes for frequently filtered fields
- Add indexes for foreign keys
- Add compound indexes for common query combinations
- Avoid over-indexing as it slows down writes

### Query Optimization

#### Efficient Queries

Example of an efficient query with proper selection:

```typescript
// Good: Only select needed fields
const users = await prisma.user.findMany({
  where: { agencyId },
  select: {
    id: true,
    name: true,
    email: true,
    role: true
  }
});

// Bad: Fetches everything including relations
const users = await prisma.user.findMany({
  where: { agencyId }
});
```

#### Pagination

All list endpoints should use pagination:

```typescript
// app/api/requests/route.ts
export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = parseInt(url.searchParams.get('offset') || '0');
  const status = url.searchParams.get('status');
  
  // Build query
  const where = {};
  if (status) where.status = status;
  
  // Add pagination
  const requests = await prisma.request.findMany({
    where,
    take: Math.min(limit, 100), // Cap at 100
    skip: offset,
    orderBy: { createdAt: 'desc' }
  });
  
  // Get total count for pagination
  const total = await prisma.request.count({ where });
  
  return new Response(JSON.stringify({
    requests,
    total,
    limit,
    offset
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

#### Batching Queries

For related data, use Prisma's `include` instead of multiple queries:

```typescript
// Good: Single query with includes
const request = await prisma.request.findUnique({
  where: { id },
  include: {
    user: {
      select: { id: true, name: true, email: true }
    },
    tasks: true
  }
});

// Bad: Multiple queries
const request = await prisma.request.findUnique({ where: { id } });
const user = await prisma.user.findUnique({ where: { id: request.userId } });
const tasks = await prisma.task.findMany({ where: { requestId: id } });
```

### Connection Pooling

For production environments, consider implementing connection pooling:

```typescript
// lib/db.ts with connection pooling
import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

const prismaClientSingleton = () => {
  return new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      },
    },
    // Configure connection pool
    log: ['query', 'info', 'warn', 'error'],
    // Recommended for serverless environments
    connection: {
      pool: {
        min: 1,
        max: 10
      }
    }
  });
};

export const prisma = global.prisma || prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}
```

## Backup and Recovery

### Automated Backups

Set up automated PostgreSQL backups:

```bash
#!/bin/bash
# /usr/local/bin/backup-rylie-db.sh

# Configuration
BACKUP_DIR="/var/backups/rylie-seo-hub"
BACKUP_RETENTION_DAYS=14
DB_NAME="rylie_seo_hub"
DB_USER="rylie_admin"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Perform backup
pg_dump -U $DB_USER -d $DB_NAME | gzip > "$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"

# Delete old backups
find $BACKUP_DIR -name "${DB_NAME}_*.sql.gz" -mtime +$BACKUP_RETENTION_DAYS -delete
```

Set up a cron job to run this script daily:

```
0 2 * * * /usr/local/bin/backup-rylie-db.sh
```

### Recovery Procedure

To restore from a backup:

```bash
# Uncompress the backup
gunzip -c /var/backups/rylie-seo-hub/rylie_seo_hub_20250701_020000.sql.gz > /tmp/restore.sql

# Restore to database
psql -U rylie_admin -d rylie_seo_hub -f /tmp/restore.sql

# Cleanup
rm /tmp/restore.sql
```

### Point-in-Time Recovery

For critical deployments, configure PostgreSQL for point-in-time recovery (PITR):

1. Enable WAL archiving in `postgresql.conf`:
   ```
   wal_level = replica
   archive_mode = on
   archive_command = 'cp %p /var/lib/postgresql/archive/%f'
   ```

2. Create the archive directory:
   ```bash
   mkdir -p /var/lib/postgresql/archive
   chown postgres:postgres /var/lib/postgresql/archive
   ```

3. Restart PostgreSQL:
   ```bash
   sudo systemctl restart postgresql
   ```

## Multi-Tenant Considerations

The platform uses a multi-tenant architecture with data isolation:

### Data Isolation

Data is isolated at the query level:

```typescript
// Example of agency-scoped query
async function getRequestsForAgency(agencyId: string) {
  return prisma.request.findMany({
    where: { agencyId }
  });
}

// Example of user-scoped query
async function getRequestsForUser(userId: string) {
  return prisma.request.findMany({
    where: { userId }
  });
}
```

### Tenant Identification

Tenants (agencies) are identified through:

1. User session data which includes `agencyId`
2. API routes that enforce agency-specific access
3. Middleware that verifies appropriate permissions

### Cross-Tenant Operations

For super admins who need cross-tenant access:

```typescript
// Super admin query with no tenant filtering
async function getAllRequests(session) {
  if (session.user.role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized');
  }
  
  return prisma.request.findMany({
    include: {
      user: {
        select: { id: true, name: true, email: true, agencyId: true }
      },
      agency: {
        select: { id: true, name: true }
      }
    }
  });
}
```

## Data Access Patterns

### Repository Pattern

The platform uses a repository pattern for consistent data access:

```typescript
// lib/repositories/userRepository.ts
export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id }
  });
}

export async function getUsersForAgency(agencyId: string) {
  return prisma.user.findMany({
    where: { agencyId }
  });
}

export async function createUser(data) {
  return prisma.user.create({
    data
  });
}

export async function updateUser(id: string, data) {
  return prisma.user.update({
    where: { id },
    data
  });
}

export async function deleteUser(id: string) {
  return prisma.user.delete({
    where: { id }
  });
}
```

### Transaction Support

For operations that require consistency across multiple updates:

```typescript
// Example transaction for creating a request with tasks
export async function createRequestWithTasks(requestData, tasks) {
  return prisma.$transaction(async (tx) => {
    // Create the request
    const request = await tx.request.create({
      data: requestData
    });
    
    // Create tasks for the request
    const taskPromises = tasks.map(task => 
      tx.task.create({
        data: {
          ...task,
          requestId: request.id,
          userId: requestData.userId
        }
      })
    );
    
    const createdTasks = await Promise.all(taskPromises);
    
    // Return combined result
    return {
      request,
      tasks: createdTasks
    };
  });
}
```

### Soft Deletes

For certain data types, consider implementing soft deletes:

```typescript
// Add a deleted field to the model
model Request {
  // Other fields...
  deleted    Boolean  @default(false)
  deletedAt  DateTime?
}

// Repository implementation
export async function softDeleteRequest(id: string) {
  return prisma.request.update({
    where: { id },
    data: {
      deleted: true,
      deletedAt: new Date()
    }
  });
}

// Query implementation
export async function getActiveRequests() {
  return prisma.request.findMany({
    where: { deleted: false }
  });
}
```

## Advanced Operations

### Manual Schema Adjustments

For schema changes that can't be handled by Prisma migrations:

1. Create a SQL script for the change:
   ```sql
   -- scripts/manual-adjustments.sql
   ALTER TABLE "Request" ADD COLUMN IF NOT EXISTS "legacyId" TEXT;
   CREATE INDEX IF NOT EXISTS "Request_legacyId_idx" ON "Request"("legacyId");
   ```

2. Execute the script against the database:
   ```bash
   psql -U rylie_admin -d rylie_seo_hub -f scripts/manual-adjustments.sql
   ```

3. Update your Prisma schema to match the changes
4. Generate the Prisma client:
   ```bash
   npx prisma generate
   ```

### Data Seeding

To seed your database with initial data:

1. Create a seed script:
   ```typescript
   // prisma/seed.ts
   import { PrismaClient } from '@prisma/client';
   const prisma = new PrismaClient();
   
   async function main() {
     // Create a super admin user
     await prisma.user.upsert({
       where: { email: 'admin@example.com' },
       update: {},
       create: {
         email: 'admin@example.com',
         name: 'System Admin',
         role: 'SUPER_ADMIN',
         onboardingCompleted: true
       }
     });
     
     // Create default system settings
     await prisma.systemSettings.upsert({
       where: { id: 'default' },
       update: {},
       create: {
         id: 'default',
         maintenanceMode: false,
         newUserRegistration: true,
         emailNotifications: true,
         auditLogging: true
       }
     });
     
     console.log('Database seeded!');
   }
   
   main()
     .catch((e) => {
       console.error(e);
       process.exit(1);
     })
     .finally(async () => {
       await prisma.$disconnect();
     });
   ```

2. Configure the seed script in `package.json`:
   ```json
   {
     "prisma": {
       "seed": "tsx prisma/seed.ts"
     }
   }
   ```

3. Run the seed script:
   ```bash
   npx prisma db seed
   ```

### Bulk Operations

For large-scale data operations:

```typescript
// Example bulk update function
export async function bulkUpdateRequestStatus(requestIds: string[], status: string) {
  return prisma.$transaction(async (tx) => {
    // Process in batches of 100
    const batchSize = 100;
    const batches = Math.ceil(requestIds.length / batchSize);
    
    for (let i = 0; i < batches; i++) {
      const batchIds = requestIds.slice(i * batchSize, (i + 1) * batchSize);
      
      await tx.request.updateMany({
        where: {
          id: { in: batchIds }
        },
        data: {
          status,
          updatedAt: new Date()
        }
      });
    }
    
    return { count: requestIds.length };
  });
}
```

## Maintenance Procedures

### Regular Maintenance Tasks

Set up the following regular maintenance tasks:

#### 1. Database Vacuuming

Run VACUUM periodically to reclaim space and optimize performance:

```bash
# Add to crontab to run weekly
0 3 * * 0 psql -U rylie_admin -d rylie_seo_hub -c "VACUUM ANALYZE;"
```

#### 2. Index Maintenance

Rebuild indexes periodically:

```bash
# Add to crontab to run monthly
0 4 1 * * psql -U rylie_admin -d rylie_seo_hub -c "REINDEX DATABASE rylie_seo_hub;"
```

#### 3. Session Cleanup

Clean up expired sessions:

```typescript
// lib/maintenance/cleanupSessions.ts
import { prisma } from '@/lib/db';

export async function cleanupExpiredSessions() {
  const now = new Date();
  
  const result = await prisma.session.deleteMany({
    where: {
      expires: {
        lt: now
      }
    }
  });
  
  return { deletedCount: result.count };
}
```

#### 4. Usage Reset

Reset package usage counters at the start of billing periods:

```typescript
// lib/maintenance/resetUsage.ts
import { prisma } from '@/lib/db';

export async function resetMonthlyUsage() {
  // First, archive current usage
  const users = await prisma.user.findMany({
    where: {
      activePackageType: { not: null }
    },
    select: {
      id: true,
      activePackageType: true,
      pagesUsedThisPeriod: true,
      blogsUsedThisPeriod: true,
      gbpPostsUsedThisPeriod: true,
      improvementsUsedThisPeriod: true
    }
  });
  
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const year = now.getFullYear();
  
  // Create archive records and reset usage in a transaction
  return prisma.$transaction(async (tx) => {
    // Archive current usage
    for (const user of users) {
      await tx.monthlyUsage.create({
        data: {
          userId: user.id,
          month,
          year,
          packageType: user.activePackageType,
          pagesUsed: user.pagesUsedThisPeriod,
          blogsUsed: user.blogsUsedThisPeriod,
          gbpPostsUsed: user.gbpPostsUsedThisPeriod,
          improvementsUsed: user.improvementsUsedThisPeriod
        }
      });
    }
    
    // Reset all users' usage counters
    await tx.user.updateMany({
      where: {
        activePackageType: { not: null }
      },
      data: {
        pagesUsedThisPeriod: 0,
        blogsUsedThisPeriod: 0,
        gbpPostsUsedThisPeriod: 0,
        improvementsUsedThisPeriod: 0,
        currentBillingPeriodStart: now,
        currentBillingPeriodEnd: new Date(now.setMonth(now.getMonth() + 1))
      }
    });
    
    return { archivedCount: users.length };
  });
}
```

### Monitoring Database Size

Monitor database size growth:

```sql
-- Get database size
SELECT pg_size_pretty(pg_database_size('rylie_seo_hub'));

-- Get table sizes
SELECT
  table_name,
  pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as total_size,
  pg_size_pretty(pg_relation_size(quote_ident(table_name))) as table_size,
  pg_size_pretty(pg_indexes_size(quote_ident(table_name))) as index_size
FROM
  information_schema.tables
WHERE
  table_schema = 'public'
ORDER BY
  pg_total_relation_size(quote_ident(table_name)) DESC;
```

Create a script to alert when database size exceeds thresholds:

```typescript
// scripts/monitor-db-size.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import nodemailer from 'nodemailer';

const execAsync = promisify(exec);

async function getDatabaseSize() {
  const { stdout } = await execAsync(
    `psql -U rylie_admin -d rylie_seo_hub -t -c "SELECT pg_database_size('rylie_seo_hub')"`
  );
  return parseInt(stdout.trim(), 10);
}

async function checkDatabaseSize() {
  const size = await getDatabaseSize();
  const sizeGB = size / (1024 * 1024 * 1024);
  
  // Alert if size exceeds 10GB
  if (sizeGB > 10) {
    // Send email alert
    const transporter = nodemailer.createTransport({
      // Configure email transport
    });
    
    await transporter.sendMail({
      from: 'alerts@rylieseo.com',
      to: 'admin@rylieseo.com',
      subject: 'Database Size Alert',
      text: `The database size is now ${sizeGB.toFixed(2)}GB, exceeding the 10GB threshold.`
    });
  }
}

checkDatabaseSize().catch(console.error);
```

## Security Considerations

### Encryption of Sensitive Data

Sensitive data like API keys should be encrypted before storage:

```typescript
// lib/encryption.ts
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-cbc';

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
  throw new Error('ENCRYPTION_KEY must be at least 32 characters long');
}

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY.slice(0, 32), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

export function decrypt(text: string): string {
  const [ivHex, encryptedHex] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY.slice(0, 32), iv);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

Use these functions when storing sensitive data:

```typescript
// Example: Storing GA4 access token
export async function saveGA4Connection(userId: string, accessToken: string, refreshToken: string) {
  return prisma.gA4Connection.create({
    data: {
      userId,
      accessToken: encrypt(accessToken),
      refreshToken: refreshToken ? encrypt(refreshToken) : null
    }
  });
}

// Example: Retrieving GA4 access token
export async function getGA4AccessToken(userId: string) {
  const connection = await prisma.gA4Connection.findUnique({
    where: { userId }
  });
  
  if (!connection) return null;
  
  return decrypt(connection.accessToken);
}
```

### Database User Permissions

Create database users with appropriate permissions:

```sql
-- Create application user with restricted permissions
CREATE USER rylie_app WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE rylie_seo_hub TO rylie_app;
GRANT USAGE ON SCHEMA public TO rylie_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO rylie_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO rylie_app;

-- Alter default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO rylie_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO rylie_app;

-- Create read-only user for monitoring and reporting
CREATE USER rylie_readonly WITH PASSWORD 'readonly_password';
GRANT CONNECT ON DATABASE rylie_seo_hub TO rylie_readonly;
GRANT USAGE ON SCHEMA public TO rylie_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO rylie_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO rylie_readonly;
```

### Audit Logging

Implement audit logging for sensitive operations:

```typescript
// lib/audit.ts
import { prisma } from '@/lib/db';

export interface AuditLogEvent {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}

export async function logAuditEvent(event: AuditLogEvent) {
  return prisma.auditLog.create({
    data: {
      userId: event.userId,
      action: event.action,
      resource: event.resource,
      resourceId: event.resourceId,
      details: event.details || {},
      ipAddress: event.ipAddress,
      userAgent: event.userAgent
    }
  });
}
```

Use this function for sensitive operations:

```typescript
// Example: Logging user role change
export async function updateUserRole(adminUserId: string, targetUserId: string, newRole: string, req: Request) {
  // Update the user role
  await prisma.user.update({
    where: { id: targetUserId },
    data: { role: newRole }
  });
  
  // Log the action
  await logAuditEvent({
    userId: adminUserId,
    action: 'USER_ROLE_UPDATE',
    resource: 'User',
    resourceId: targetUserId,
    details: { newRole, previousRole: currentUser.role },
    ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
    userAgent: req.headers.get('user-agent') || 'unknown'
  });
}
```

## Troubleshooting

### Common Database Issues

#### Connection Pool Exhaustion

If you see "Connection pool exhausted" errors:

1. Check for open connections:
   ```sql
   SELECT count(*) FROM pg_stat_activity WHERE datname = 'rylie_seo_hub';
   ```

2. Check for long-running queries:
   ```sql
   SELECT pid, now() - pg_stat_activity.query_start AS duration, query
   FROM pg_stat_activity
   WHERE datname = 'rylie_seo_hub' AND state = 'active'
   ORDER BY duration DESC;
   ```

3. Terminate stuck queries if necessary:
   ```sql
   SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE datname = 'rylie_seo_hub' AND state = 'active' AND now() - pg_stat_activity.query_start > interval '5 minutes';
   ```

4. Adjust connection pool settings in `lib/db.ts`

#### Slow Queries

If you encounter slow queries:

1. Identify slow queries in logs or using Prisma logging
2. Check execution plan:
   ```sql
   EXPLAIN ANALYZE SELECT * FROM "Request" WHERE "agencyId" = 'agency123' AND "status" = 'PENDING';
   ```

3. Add appropriate indexes if needed:
   ```sql
   CREATE INDEX IF NOT EXISTS "Request_agencyId_status_idx" ON "Request"("agencyId", "status");
   ```

4. Update Prisma schema to include the new index

#### Database Locks

If you encounter database lock issues:

1. Check for locks:
   ```sql
   SELECT relation::regclass, mode, pid, pg_blocking_pids(pid) as blocked_by
   FROM pg_locks
   WHERE NOT granted;
   ```

2. Identify blocking processes:
   ```sql
   SELECT pid, query, age(clock_timestamp(), query_start) as time
   FROM pg_stat_activity
   WHERE pid IN (SELECT unnest(pg_blocking_pids(pid)) FROM pg_locks WHERE NOT granted);
   ```

3. Terminate blocking processes if necessary:
   ```sql
   SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE pid = 12345;  -- Replace with actual PID
   ```

### Prisma Specific Issues

#### Prisma Client Generation Errors

If you encounter Prisma client generation errors:

1. Clear Prisma cache:
   ```bash
   rm -rf node_modules/.prisma
   ```

2. Regenerate the client:
   ```bash
   npx prisma generate
   ```

3. If errors persist, check the schema for syntax errors

#### Migration Conflicts

If you encounter migration conflicts:

1. Check the migration history:
   ```bash
   npx prisma migrate status
   ```

2. For development environments, consider resetting:
   ```bash
   npx prisma migrate reset
   ```

3. For production, create a corrective migration:
   ```bash
   # First, adjust schema.prisma to match production
   # Then create an empty migration
   npx prisma migrate dev --name fix_schema_drift --create-only
   # Edit the migration file to include necessary fixes
   # Apply the migration
   npx prisma migrate deploy
   ```

#### Data Type Mismatches

If you encounter data type mismatch errors:

1. Check the Prisma schema for correct types
2. Check the database schema for discrepancies:
   ```sql
   SELECT column_name, data_type, character_maximum_length
   FROM information_schema.columns
   WHERE table_name = 'Request';
   ```

3. Create a migration to fix the discrepancy if needed
