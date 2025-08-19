# Database Migration Safety Checklist

## MANDATORY Pre-Migration Steps

### 🔴 CRITICAL - NEVER SKIP THESE STEPS

1. **Create Verified Backup**
   ```bash
   node scripts/db-backup-verify.js
   ```
   - ✅ Backup file created and verified
   - ✅ Backup contains all critical tables
   - ✅ Backup restoration tested successfully
   - ✅ Backup file size > 0 bytes

2. **Review Migration for Destructive Operations**
   - ✅ No `DROP TABLE` statements
   - ✅ No `DROP DATABASE` statements  
   - ✅ No `DELETE FROM` without WHERE clause
   - ✅ No `TRUNCATE` statements
   - ✅ No `ALTER TABLE DROP COLUMN` statements

3. **Environment Verification**
   - ✅ `DATABASE_URL` points to correct database
   - ✅ Database connection working
   - ✅ Required environment variables present
   - ✅ Prisma schema validates with `npx prisma validate`

## Safe Migration Execution

### Use Safe Migration Script
```bash
# Full safety with backup
node scripts/safe-migrate.js migrate

# Emergency restore if needed
node scripts/safe-migrate.js restore /path/to/backup.sql
```

### Manual Migration (Only if Script Fails)
```bash
# 1. Create backup first
node scripts/db-backup-verify.js backup

# 2. Generate client
npx prisma generate

# 3. Deploy migrations
npx prisma migrate deploy

# 4. Verify with type check
npm run type-check
```

## Post-Migration Verification

### 1. **Database Integrity Check**
```bash
node scripts/test-auth-endpoints.js
```

### 2. **Critical Table Verification**
```sql
-- Verify core tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'agencies', 'dealerships', 'ga4_connections', 'search_console_connections');

-- Verify row counts didn't drop unexpectedly
SELECT 'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL
SELECT 'agencies', COUNT(*) FROM agencies
UNION ALL  
SELECT 'dealerships', COUNT(*) FROM dealerships;
```

### 3. **Application Health Check**
```bash
# Start development server
npm run dev

# Test endpoints
curl http://localhost:3000/api/health
curl http://localhost:3000/api/admin/agencies
```

### 4. **Google OAuth Flow Test**
- Test GA4 auth: `/api/ga4/auth/callback` (should redirect with error message for missing params)
- Test Search Console auth: `/api/search-console/callback` (should redirect with error message)
- Verify encrypted tokens can be stored and retrieved

## Emergency Recovery Procedures

### If Migration Fails

1. **Immediate Actions**
   ```bash
   # Stop all services
   pkill -f "npm run dev"
   pkill -f "next"
   
   # Restore from latest backup
   psql $DATABASE_URL < backups/backup-YYYY-MM-DD.sql
   
   # Verify restoration
   node scripts/test-auth-endpoints.js
   ```

2. **Root Cause Analysis**
   - Review migration logs
   - Check Prisma migration files
   - Verify schema compatibility
   - Document lessons learned

### If Data Loss Detected

1. **Assess Scope**
   ```sql
   -- Check table counts
   SELECT schemaname, tablename, 
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
          (SELECT COUNT(*) FROM information_schema.columns 
           WHERE table_name = tablename AND table_schema = schemaname) as column_count
   FROM pg_tables WHERE schemaname = 'public';
   ```

2. **Restore Strategy**
   - Restore from most recent verified backup
   - Identify missing data since backup
   - Manual data recreation if necessary
   - Update affected users

## Prevention Guidelines

### Code Review Requirements
- All schema changes require review
- Backup verification mandatory for production
- Testing in staging environment first
- Documentation of rollback procedures

### Environment Management
- Use different DATABASE_URL for different environments
- Never test migrations on production directly
- Maintain backup retention policy (30 days minimum)
- Regular backup testing schedule

### Monitoring Setup
- Database connection monitoring
- Table row count monitoring  
- Failed migration alerting
- Backup verification alerting

## Emergency Contacts

### Database Recovery Team
- Primary: System Administrator
- Secondary: Senior Developer
- Escalation: Technical Lead

### Incident Response
1. Stop all database operations
2. Assess damage scope
3. Restore from backup
4. Verify functionality
5. Document incident
6. Improve procedures

---

## Lessons Learned from Previous Incident

### What Went Wrong
- Migration executed without verified backup
- Destructive operation not caught in review
- Production database targeted instead of staging
- No rollback plan in place

### Preventive Measures Implemented
- Mandatory backup verification script
- Safe migration script with built-in safeguards
- Schema validation before deployment
- Multiple verification steps
- Clear emergency recovery procedures

**Remember: It's better to be overly cautious with database operations than to risk data loss.**