# Database Management Guide

This guide provides detailed information about database management for the Rylie SEO Hub platform, including schema design, migrations, optimization, and maintenance procedures.

## Table of Contents

- [Overview](#overview)
- [Database Schema](#database-schema)
- [Prisma ORM](#prisma-orm)
- [Common Patterns](#common-patterns)
- [Migrations](#migrations)
- [Performance Optimization](#performance-optimization)
- [Backup and Recovery](#backup-and-recovery)
- [Multi-Tenant Considerations](#multi-tenant-considerations)
- [Data Access Patterns](#data-access-patterns)
- [Advanced Operations](#advanced-operations)
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

## Common Patterns

### Query Structure
Most queries follow this pattern:

```typescript
// Basic query structure
const result = await prisma.model.operation({
  where: { field: value },
  select: { field1: true, field2: true }, // Only select needed fields
  include: { relation: true }, // Include related data when needed
  orderBy: { field: 'desc' },
  take: limit,
  skip: offset
});
```

### Error Handling
Standard error handling pattern:

```typescript
try {
  const result = await prisma.operation();
  return result;
} catch (error) {
  if (error.code === 'P2002') {
    throw new Error('Unique constraint violation');
  }
  throw error;
}
```

### Transaction Pattern
For operations requiring consistency:

```typescript
return prisma.$transaction(async (tx) => {
  const result1 = await tx.model1.create({ data });
  const result2 = await tx.model2.update({ where, data });
  return { result1, result2 };
});
```

## Migrations

### Creating Migrations

```bash
# Development environment
npm run db:migrate:dev -- --name descriptive_migration_name
```

### Applying Migrations

```bash
# Production environment
npm run db:migrate
```

### Migration Troubleshooting

| Issue | Solution |
|-------|----------|
| **Reset Development Database** | `npm run db:migrate:reset` |
| **Migration Conflicts** | Check status with `npx prisma migrate status`, create corrective migration |
| **Production Migration Failures** | Test in staging, create corrective migration, use manual SQL as last resort |

## Performance Optimization

### Indexes

Strategic indexes for common query patterns:

```prisma
model Request {
  // Fields...
  
  @@index([userId, status])
  @@index([agencyId, status])
  @@index([status, createdAt])
  @@index([seoworksTaskId])
}
```

**Index Guidelines:**
- Add indexes for frequently filtered fields
- Add indexes for foreign keys
- Add compound indexes for common query combinations
- Avoid over-indexing as it slows down writes

### Query Optimization

#### Efficient Queries

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

```typescript
const requests = await prisma.request.findMany({
  where,
  take: Math.min(limit, 100), // Cap at 100
  skip: offset,
  orderBy: { createdAt: 'desc' }
});

const total = await prisma.request.count({ where });
```

#### Batching Queries

```typescript
// Good: Single query with includes
const request = await prisma.request.findUnique({
  where: { id },
  include: {
    user: { select: { id: true, name: true, email: true } },
    tasks: true
  }
});

// Bad: Multiple queries
const request = await prisma.request.findUnique({ where: { id } });
const user = await prisma.user.findUnique({ where: { id: request.userId } });
const tasks = await prisma.task.findMany({ where: { requestId: id } });
```

### Connection Pooling

For production environments:

```typescript
// lib/db.ts with connection pooling
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
    connection: {
      pool: {
        min: 1,
        max: 10
      }
    }
  });
};
```

## Backup and Recovery

### Automated Backups

```bash
#!/bin/bash
# /usr/local/bin/backup-rylie-db.sh

BACKUP_DIR="/var/backups/rylie-seo-hub"
BACKUP_RETENTION_DAYS=14
DB_NAME="rylie_seo_hub"
DB_USER="rylie_admin"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

mkdir -p $BACKUP_DIR
pg_dump -U $DB_USER -d $DB_NAME | gzip > "$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"
find $BACKUP_DIR -name "${DB_NAME}_*.sql.gz" -mtime +$BACKUP_RETENTION_DAYS -delete
```

Set up cron job:
```
0 2 * * * /usr/local/bin/backup-rylie-db.sh
```

### Recovery Procedure

```bash
# Restore from backup
gunzip -c /var/backups/rylie-seo-hub/rylie_seo_hub_20250701_020000.sql.gz > /tmp/restore.sql
psql -U rylie_admin -d rylie_seo_hub -f /tmp/restore.sql
rm /tmp/restore.sql
```

### Point-in-Time Recovery

```
# postgresql.conf settings
wal_level = replica
archive_mode = on
archive_command = 'cp %p /var/lib/postgresql/archive/%f'
```

## Multi-Tenant Considerations

### Data Isolation

Data is isolated at the query level:

```typescript
// Agency-scoped query
async function getRequestsForAgency(agencyId: string) {
  return prisma.request.findMany({
    where: { agencyId }
  });
}

// User-scoped query
async function getRequestsForUser(userId: string) {
  return prisma.request.findMany({
    where: { userId }
  });
}
```

### Cross-Tenant Operations

For super admins:

```typescript
async function getAllRequests(session) {
  if (session.user.role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized');
  }
  
  return prisma.request.findMany({
    include: {
      user: { select: { id: true, name: true, email: true, agencyId: true } },
      agency: { select: { id: true, name: true } }
    }
  });
}
```

## Data Access Patterns

### Repository Pattern

```typescript
// lib/repositories/userRepository.ts
export async function getUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export async function getUsersForAgency(agencyId: string) {
  return prisma.user.findMany({ where: { agencyId } });
}

export async function createUser(data) {
  return prisma.user.create({ data });
}

export async function updateUser(id: string, data) {
  return prisma.user.update({ where: { id }, data });
}

export async function deleteUser(id: string) {
  return prisma.user.delete({ where: { id } });
}
```

### Transaction Support

```typescript
export async function createRequestWithTasks(requestData, tasks) {
  return prisma.$transaction(async (tx) => {
    const request = await tx.request.create({ data: requestData });
    
    const taskPromises = tasks.map(task => 
      tx.task.create({
        data: { ...task, requestId: request.id, userId: requestData.userId }
      })
    );
    
    const createdTasks = await Promise.all(taskPromises);
    return { request, tasks: createdTasks };
  });
}
```

### Soft Deletes

```typescript
// Model with soft delete
model Request {
  // Other fields...
  deleted    Boolean  @default(false)
  deletedAt  DateTime?
}

// Repository implementation
export async function softDeleteRequest(id: string) {
  return prisma.request.update({
    where: { id },
    data: { deleted: true, deletedAt: new Date() }
  });
}

export async function getActiveRequests() {
  return prisma.request.findMany({
    where: { deleted: false }
  });
}
```

## Advanced Operations

### Manual Schema Adjustments

1. Create SQL script:
   ```sql
   -- scripts/manual-adjustments.sql
   ALTER TABLE "Request" ADD COLUMN IF NOT EXISTS "legacyId" TEXT;
   CREATE INDEX IF NOT EXISTS "Request_legacyId_idx" ON "Request"("legacyId");
   ```

2. Execute against database:
   ```bash
   psql -U rylie_admin -d rylie_seo_hub -f scripts/manual-adjustments.sql
   ```

3. Update Prisma schema to match
4. Generate client: `npx prisma generate`

### Data Seeding

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
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

Configure in `package.json`:
```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

Run: `npx prisma db seed`

### Bulk Operations

```typescript
export async function bulkUpdateRequestStatus(requestIds: string[], status: string) {
  return prisma.$transaction(async (tx) => {
    const batchSize = 100;
    const batches = Math.ceil(requestIds.length / batchSize);
    
    for (let i = 0; i < batches; i++) {
      const batchIds = requestIds.slice(i * batchSize, (i + 1) * batchSize);
      
      await tx.request.updateMany({
        where: { id: { in: batchIds } },
        data: { status, updatedAt: new Date() }
      });
    }
    
    return { count: requestIds.length };
  });
}
```

## Maintenance Procedures

### Regular Maintenance Tasks

| Task | Schedule | Command |
|------|----------|---------|
| **Database Vacuuming** | Weekly | `0 3 * * 0 psql -U rylie_admin -d rylie_seo_hub -c "VACUUM ANALYZE;"` |
| **Index Maintenance** | Monthly | `0 4 1 * * psql -U rylie_admin -d rylie_seo_hub -c "REINDEX DATABASE rylie_seo_hub;"` |

### Session Cleanup

```typescript
// lib/maintenance/cleanupSessions.ts
export async function cleanupExpiredSessions() {
  const result = await prisma.session.deleteMany({
    where: { expires: { lt: new Date() } }
  });
  return { deletedCount: result.count };
}
```

### Usage Reset

```typescript
// lib/maintenance/resetUsage.ts
export async function resetMonthlyUsage() {
  const users = await prisma.user.findMany({
    where: { activePackageType: { not: null } },
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
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  
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
    
    // Reset usage counters
    await tx.user.updateMany({
      where: { activePackageType: { not: null } },
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

### Database Size Monitoring

```sql
-- Get database size
SELECT pg_size_pretty(pg_database_size('rylie_seo_hub'));

-- Get table sizes
SELECT
  table_name,
  pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as total_size,
  pg_size_pretty(pg_relation_size(quote_ident(table_name))) as table_size,
  pg_size_pretty(pg_indexes_size(quote_ident(table_name))) as index_size
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY pg_total_relation_size(quote_ident(table_name)) DESC;
```

## Security Considerations

### Encryption of Sensitive Data

```typescript
// lib/encryption.ts
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-cbc';

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

### Database User Permissions

```sql
-- Create application user with restricted permissions
CREATE USER rylie_app WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE rylie_seo_hub TO rylie_app;
GRANT USAGE ON SCHEMA public TO rylie_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO rylie_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO rylie_app;

-- Create read-only user for monitoring
CREATE USER rylie_readonly WITH PASSWORD 'readonly_password';
GRANT CONNECT ON DATABASE rylie_seo_hub TO rylie_readonly;
GRANT USAGE ON SCHEMA public TO rylie_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO rylie_readonly;
```

### Audit Logging

```typescript
// lib/audit.ts
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

## Troubleshooting

### Common Database Issues

| Issue | Diagnostic | Solution |
|-------|------------|----------|
| **Connection Pool Exhaustion** | `SELECT count(*) FROM pg_stat_activity WHERE datname = 'rylie_seo_hub';` | Check for long-running queries, adjust pool settings |
| **Slow Queries** | `EXPLAIN ANALYZE SELECT ...` | Add appropriate indexes, optimize query structure |
| **Database Locks** | `SELECT relation::regclass, mode, pid FROM pg_locks WHERE NOT granted;` | Identify and terminate blocking processes |

### Prisma Specific Issues

| Issue | Solution |
|-------|----------|
| **Client Generation Errors** | Clear cache: `rm -rf node_modules/.prisma`, regenerate: `npx prisma generate` |
| **Migration Conflicts** | Check status: `npx prisma migrate status`, reset dev: `npx prisma migrate reset` |
| **Data Type Mismatches** | Check schema discrepancies, create corrective migration |

### Quick Diagnostics

```bash
# Check migration status
npx prisma migrate status

# Check for stuck connections
psql -U rylie_admin -d rylie_seo_hub -c "
  SELECT count(*) as active_connections 
  FROM pg_stat_activity 
  WHERE datname = 'rylie_seo_hub' AND state = 'active';
"

# Check for long-running queries
psql -U rylie_admin -d rylie_seo_hub -c "
  SELECT pid, now() - query_start AS duration, query
  FROM pg_stat_activity
  WHERE datname = 'rylie_seo_hub' AND state = 'active'
  ORDER BY duration DESC LIMIT 5;
"

# Check database size
psql -U rylie_admin -d rylie_seo_hub -c "
  SELECT pg_size_pretty(pg_database_size('rylie_seo_hub'));
"
```