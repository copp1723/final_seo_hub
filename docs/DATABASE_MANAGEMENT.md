# Database Management Guide

This guide helps prevent database schema issues and provides recovery procedures.

## ✅ Current Status

Your database schema is now properly set up with:
- ✅ Proper migration system in place
- ✅ All enums correctly defined (RequestStatus, UserRole, etc.)
- ✅ All required tables (AuditLog, SystemSettings, etc.)
- ✅ SUPER_ADMIN users configured

## 🚀 Quick Commands

### For Production/Render Deployment

```bash
# Apply all migrations (safe for production)
npx prisma migrate deploy

# Set up SUPER_ADMIN users after reset
npm run db:setup-admins

# Complete reset with admin setup (DESTRUCTIVE - deletes all data)
npm run db:reset-with-admins
```

### For Development

```bash
# Create new migration after schema changes
npx prisma migrate dev --name your_migration_name

# Push schema changes without migration (dev only)
npx prisma db push

# View database in browser
npx prisma studio
```

## 🔧 Recovery Procedures

### If You Get Schema Errors Again

1. **Check if migrations exist:**
   ```bash
   ls -la prisma/migrations/
   ```

2. **If no migrations folder, you're missing the migration system:**
   - The migration files in this repo should prevent this
   - Run: `npx prisma migrate deploy`

3. **If you get enum/table errors:**
   ```bash
   # In Render shell:
   npx prisma db push
   npm run db:setup-admins
   ```

### Emergency Database Reset (DESTRUCTIVE)

```bash
# In Render shell - THIS DELETES ALL DATA
npx prisma migrate reset --force
npm run db:setup-admins
```

## 📋 SUPER_ADMIN Setup

### Current SUPER_ADMIN Users
- josh.copp@onekeel.ai
- Kyle.Olinger@onekeel.ai

### To Add New SUPER_ADMIN Users

1. **Edit the script:**
   ```bash
   # Edit scripts/setup-super-admins.sql
   # Add new email to the arrays
   ```

2. **Run the setup:**
   ```bash
   npm run db:setup-admins
   ```

### Manual SUPER_ADMIN Setup

```bash
# In Render shell:
echo "UPDATE \"User\" SET role = 'SUPER_ADMIN' WHERE email = 'new.admin@email.com';" | npx prisma db execute --schema=prisma/schema.prisma --stdin
```

## 🛡️ Prevention

### Always Use Migrations

- ✅ **DO:** Use `npx prisma migrate dev` for schema changes
- ❌ **DON'T:** Use `npx prisma db push` in production
- ✅ **DO:** Commit migration files to git
- ❌ **DON'T:** Delete the `prisma/migrations` folder

### Schema Change Workflow

1. **Modify `prisma/schema.prisma`**
2. **Create migration:** `npx prisma migrate dev --name descriptive_name`
3. **Test locally**
4. **Commit migration files**
5. **Deploy:** `npx prisma migrate deploy`

## 🔍 Troubleshooting

### Common Errors and Solutions

| Error | Solution |
|-------|----------|
| `text = "RequestStatus"` | Run `npx prisma db push` |
| `table does not exist` | Run `npx prisma migrate deploy` |
| `migration failed` | Run `npx prisma migrate reset --force` |
| `no SUPER_ADMIN access` | Run `npm run db:setup-admins` |

### Checking Database State

```bash
# See all tables
echo "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';" | npx prisma db execute --schema=prisma/schema.prisma --stdin

# Check SUPER_ADMIN users
echo "SELECT email, role FROM \"User\" WHERE role = 'SUPER_ADMIN';" | npx prisma db execute --schema=prisma/schema.prisma --stdin

# Check migration status
npx prisma migrate status
```

## 📁 Important Files

- `prisma/schema.prisma` - Database schema definition
- `prisma/migrations/` - Migration history (DO NOT DELETE)
- `scripts/setup-super-admins.sql` - SUPER_ADMIN setup script
- `package.json` - Contains helpful npm scripts

## 🚨 Emergency Contacts

If you encounter database issues:
1. Check this guide first
2. Try the recovery procedures
3. If still stuck, the migration system should prevent most issues

---

**Last Updated:** January 3, 2025
**Schema Version:** 20250103_initial_schema