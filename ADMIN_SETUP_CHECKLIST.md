# Multi-Dealership System - Admin Setup Checklist

## 🎯 Pre-Launch Setup

### ✅ System Requirements
- [ ] Database migration applied (`npx prisma db push`)
- [ ] TypeScript compilation successful (`npm run build`)
- [ ] Environment variables configured
- [ ] SUPER_ADMIN account verified

### ✅ Database Verification
```sql
-- Verify tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name = 'user_dealership_access';

-- Check enum values
SELECT unnest(enum_range(NULL::UserDealershipAccessLevel));
```

---

## 🏢 Agency Setup Options

### Option 1: New Agency (Recommended)
**Use Agency Complete Onboarding**

1. **Navigate to**: `/onboarding/seoworks`
2. **Process**:
   - Agency fills complete form
   - Creates all dealerships in one session
   - System auto-generates access permissions
   - Users get immediate multi-dealership access

3. **Benefits**:
   - ✅ Single session setup
   - ✅ Consistent data entry
   - ✅ Automatic permission assignment
   - ✅ No manual user management needed

### Option 2: Existing Agency
**Manual Setup via Admin Panel**

1. **Create Agency** (if needed):
   ```
   Navigate: /admin/agencies
   Action: Create new agency
   ```

2. **Create Dealerships**:
   ```
   Navigate: /admin/dealerships/create
   Process: Create each dealership individually
   Link: Associate with agency
   ```

3. **Setup Users**:
   ```
   Navigate: /admin/users
   Action: Create user accounts
   Assign: Initial dealership access
   ```

---

## 👥 User Management Setup

### Step 1: Identify User Types

#### Marketing Managers (Multiple Stores)
- **Typical Access**: READ to WRITE across 3-10 dealerships
- **Use Case**: Performance monitoring, content review
- **Setup**: Grant access to all store locations

#### Agency Account Managers
- **Typical Access**: ADMIN across all agency dealerships
- **Use Case**: Content creation, campaign management
- **Setup**: Bulk assign ADMIN to all dealerships

#### Dealership Staff
- **Typical Access**: WRITE to single dealership
- **Use Case**: Local content management
- **Setup**: Standard single-dealership access

### Step 2: Access Level Guidelines

| User Role | Recommended Access | Dealership Count |
|-----------|-------------------|------------------|
| Marketing Manager | READ → WRITE | Multiple (3-10) |
| Agency Admin | ADMIN | All agency dealerships |
| Content Manager | WRITE | 1-3 dealerships |
| SEO Specialist | READ → WRITE | Client dealerships |
| Dealership Owner | ADMIN | Own dealership only |

### Step 3: Bulk Assignment Process

1. **Navigate**: `/admin/users` → Bulk Assignment Tool
2. **Select Users**: Check all relevant users
3. **Select Dealerships**: Choose target locations
4. **Set Access Level**: Choose appropriate permissions
5. **Execute**: Create assignments in batch

---

## 🔧 Individual User Setup

### For Each Multi-Dealership User:

1. **Access User Profile**:
   ```
   URL: /admin/users/[userId]/dealership-access
   ```

2. **Grant Access Checklist**:
   - [ ] Select target dealership
   - [ ] Choose access level (READ/WRITE/ADMIN)
   - [ ] Set expiration date (optional)
   - [ ] Document reason for access
   - [ ] Save and verify

3. **Verification Steps**:
   - [ ] User appears in dealership access list
   - [ ] Access level displays correctly
   - [ ] Expiration date set appropriately
   - [ ] User can switch dealerships

---

## 🧪 Testing Procedures

### Basic Functionality Tests

#### Test 1: User Can Switch Dealerships
1. **Setup**: User with access to 2+ dealerships
2. **Login**: User authentication successful
3. **Verify**: Dealership switcher visible in navigation
4. **Switch**: Select different dealership from dropdown
5. **Confirm**: Page refreshes with new dealership data

#### Test 2: Access Level Enforcement
1. **READ User**:
   - [ ] Can view dashboard and reports
   - [ ] Cannot create/edit content
   - [ ] No admin menu access

2. **WRITE User**:
   - [ ] All READ permissions work
   - [ ] Can create SEO requests
   - [ ] Can edit existing content
   - [ ] Cannot access user management

3. **ADMIN User**:
   - [ ] All WRITE permissions work
   - [ ] Can manage dealership users
   - [ ] Can configure integrations
   - [ ] Full administrative access

#### Test 3: Data Isolation
1. **Switch between dealerships**
2. **Verify data changes**: Dashboard metrics update
3. **Confirm isolation**: No cross-dealership data leakage
4. **Test permissions**: Access levels work per dealership

### Security Tests

#### Access Control Verification
- [ ] Users cannot access unauthorized dealerships
- [ ] URL manipulation blocked (direct dealership access)
- [ ] Session switching works correctly
- [ ] Expired access automatically blocked

#### Permission Boundary Tests
- [ ] READ users blocked from editing
- [ ] WRITE users blocked from admin functions
- [ ] Cross-agency access properly restricted
- [ ] Audit logging captures all access changes

---

## 📋 Go-Live Checklist

### Pre-Launch (1 Week Before)
- [ ] All users created and tested
- [ ] Access permissions verified
- [ ] User training completed
- [ ] Documentation distributed
- [ ] Support procedures established

### Launch Day
- [ ] System monitoring active
- [ ] Support team on standby
- [ ] User login verification
- [ ] Dealership switching tested
- [ ] Performance monitoring confirmed

### Post-Launch (First Week)
- [ ] Daily user feedback collection
- [ ] Access issue resolution
- [ ] Performance optimization
- [ ] Feature adoption tracking
- [ ] Documentation updates

---

## 🛠️ Maintenance Procedures

### Weekly Tasks
- [ ] Review user access logs
- [ ] Check for expired permissions
- [ ] Monitor system performance
- [ ] Process access requests
- [ ] Update documentation

### Monthly Tasks
- [ ] Audit user permissions
- [ ] Review access patterns
- [ ] Clean up inactive accounts
- [ ] Update security policies
- [ ] Generate usage reports

### Quarterly Tasks
- [ ] Comprehensive access review
- [ ] User role reassessment
- [ ] System performance evaluation
- [ ] Feature usage analysis
- [ ] Security assessment

---

## 🚨 Troubleshooting Guide

### Common Issues and Solutions

#### "Bulk assignment failed"
**Cause**: Database constraints or invalid data
**Fix**: 
1. Check user IDs exist
2. Verify dealership IDs valid
3. Ensure no duplicate assignments
4. Review error logs for specifics

#### "User can't see dealership switcher"
**Cause**: User has single dealership access
**Fix**:
1. Verify user has 2+ dealership permissions
2. Check user role (USER or DEALERSHIP_ADMIN)
3. Confirm permissions are active and not expired

#### "Access denied after switching"
**Cause**: Insufficient permissions for current dealership
**Fix**:
1. Verify user's access level for that dealership
2. Check if access has expired
3. Confirm dealership is still active

### Database Issues

#### Check User Access
```sql
SELECT u.email, d.name, uda.accessLevel, uda.isActive
FROM user_dealership_access uda
JOIN users u ON uda.userId = u.id
JOIN dealerships d ON uda.dealershipId = d.id
WHERE u.email = 'user@example.com';
```

#### Verify Migration
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_dealership_access';
```

---

## 📞 Support Escalation

### Level 1: Basic Issues
- User cannot see switcher
- Login problems
- Basic permission questions
- **Handler**: Dealership admins

### Level 2: System Issues
- Database errors
- Permission conflicts
- Performance problems
- **Handler**: Agency administrators

### Level 3: Technical Issues
- System crashes
- Data corruption
- Integration failures
- **Handler**: Technical support team

---

## 📊 Success Metrics

### Adoption Metrics
- [ ] % users with multi-dealership access actively switching
- [ ] Average dealerships per user
- [ ] Daily switching frequency
- [ ] User satisfaction scores

### Performance Metrics
- [ ] Page load times after switching
- [ ] Database query performance
- [ ] Error rates and resolution times
- [ ] System uptime and availability

### Business Metrics
- [ ] User productivity improvements
- [ ] Reduced login/logout cycles
- [ ] Support ticket reduction
- [ ] Feature utilization rates

---

*Complete this checklist before launching multi-dealership access to ensure smooth deployment and user adoption.*