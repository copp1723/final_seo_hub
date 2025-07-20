# GA4 Integration Diagnostic Checklist

## 🔍 Issue Summary
- **Problem**: Only 1 GA4 property appears in dropdown despite having 44 dealerships
- **Root Cause**: GA4 connections are not properly linked to dealerships
- **Current State**: 1 GA4 connection exists but is not associated with any dealership

## 📋 Diagnostic Checklist

### 1. Database Connection Status ✅
- [x] Check GA4 connections table
- [x] Verify dealership mappings
- [x] Identify orphaned connections
- [x] Check agency-level GA4 settings

**Findings:**
- 1 GA4 connection exists (user: josh.copp@onekeel.ai)
- Connection has valid tokens and property ID (320759942)
- Connection is NOT linked to any dealership (dealershipId = null)
- 44 dealerships have no GA4 connections

### 2. API Endpoint Testing ⚠️
- [ ] Test `/api/ga4/list-properties` endpoint
- [ ] Verify Google Analytics Admin API access
- [ ] Check token refresh mechanism
- [ ] Test property listing permissions

**Required Actions:**
- Test API with authenticated session
- Verify Google API quotas and permissions
- Check if all properties are accessible

### 3. Property Listing Verification ⚠️
- [ ] Verify Google Analytics Admin API returns all properties
- [ ] Check property access permissions
- [ ] Test property filtering logic
- [ ] Verify account-level access

**Expected Behavior:**
- Should return all GA4 properties user has access to
- Properties should be filterable by account
- All dealership properties should be visible

### 4. Data Collection Verification ⚠️
- [ ] Test data retrieval for connected property (320759942)
- [ ] Verify metrics collection
- [ ] Check date range functionality
- [ ] Test real-time data access

**Test Property:** Jay Hatfield Chevrolet (ID: 320759942)

### 5. Search Console ↔ GA4 Integration ⚠️
- [ ] Verify Search Console properties are linked
- [ ] Test cross-platform data correlation
- [ ] Check property matching logic
- [ ] Verify metric synchronization

## 🛠️ Fix Steps

### Step 1: Link Existing GA4 Connection to Dealership
```sql
-- Link the existing GA4 connection to Jay Hatfield Chevrolet dealership
UPDATE ga4_connections 
SET dealershipId = 'dealer-001' 
WHERE propertyId = '320759942';
```

### Step 2: Create GA4 Connections for Other Dealerships
- Identify which dealerships need GA4 connections
- Create connections for each dealership
- Link to appropriate GA4 properties

### Step 3: Test Property Listing API
- Verify `/api/ga4/list-properties` returns all properties
- Check if dealership filtering works correctly
- Test property selection functionality

### Step 4: Verify Data Collection
- Test analytics data retrieval for each property
- Verify Search Console integration
- Check cross-platform metric correlation

## 🔧 Implementation Scripts

### 1. Link Existing Connection
```bash
node scripts/link-ga4-connection.js
```

### 2. Create Missing Connections
```bash
node scripts/create-ga4-connections.js
```

### 3. Test API Endpoints
```bash
node scripts/test-ga4-api.js
```

### 4. Verify Data Collection
```bash
node scripts/verify-ga4-data.js
```

## 📊 Expected Results

After fixes:
- [ ] All 44 dealerships should have GA4 connections
- [ ] Property dropdown should show multiple properties
- [ ] Data collection should work for all properties
- [ ] Search Console ↔ GA4 integration should be functional

## 🚨 Critical Issues to Address

1. **Missing Dealership Links**: 44 dealerships without GA4 connections
2. **Orphaned Connection**: Existing connection not linked to dealership
3. **Property Access**: Verify all properties are accessible via API
4. **Data Permissions**: Ensure proper data access for all properties

## 📝 Next Steps

1. Run the fix scripts to create missing connections
2. Test the property listing API
3. Verify data collection for all properties
4. Test Search Console integration
5. Document the resolution process 