# GA4 Data Integrity Lock-in System

## 🎯 Purpose

This system prevents the critical regression where all dealerships show identical GA4 data due to incorrect property selection logic. It provides multiple layers of protection to ensure each dealership gets their unique analytics data.

## 🔒 Protection Layers

### 1. **Automated Tests** (`__tests__/ga4-property-selection.test.ts`)
- **Purpose**: Catch regressions during development
- **Coverage**: Tests exact scenarios that caused the bug
- **Critical Test**: Ensures dealerships use their mapped properties, not fallback
- **Run**: `npm run test:ga4`

### 2. **Runtime Validation** (`lib/validation/ga4-data-integrity.ts`)
- **Purpose**: Detect issues in production
- **Function**: Monitors for identical data across different dealerships
- **Alerts**: Logs critical warnings when multiple dealerships return same data
- **Integration**: Automatically validates all GA4 responses

### 3. **Property Mapping Validation** (`scripts/validate-dealership-mappings.ts`)
- **Purpose**: Ensure mapping integrity when adding new dealerships
- **Checks**: Duplicate properties, invalid formats, missing fields
- **Run**: `npm run validate:mappings`
- **Template**: `npm run validate:mappings:template`

### 4. **Pre-commit Hooks** (`.husky/pre-commit`)
- **Purpose**: Prevent bad code from being committed
- **Actions**: Runs mapping validation and GA4 tests before each commit
- **Blocks**: Commits that would break GA4 property selection

### 5. **Monitoring Endpoint** (`/api/admin/ga4-integrity`)
- **Purpose**: Real-time production monitoring
- **Access**: Super admin only
- **Data**: Shows suspicious patterns and data integrity status
- **Alerts**: Identifies when multiple dealerships have identical data

## 🚨 Critical Rules

### **NEVER modify these without understanding the impact:**

1. **Property Selection Logic** (`lib/google/dealership-analytics-service.ts`)
   ```typescript
   // ✅ CORRECT: Use dealership property when available
   if (propertyId && hasGA4Access(dealershipId)) {
     hasDealershipMapping = true
   }
   
   // ❌ WRONG: Don't add conditions that force fallback
   if (propertyId && hasGA4Access(dealershipId) && propertyId === connection.propertyId) {
     // This breaks everything!
   }
   ```

2. **Property Mappings** (`lib/dealership-property-mapping.ts`)
   - Each dealership MUST have unique property ID
   - Run validation script before adding new mappings
   - Test with actual data after changes

3. **Test Coverage** (`__tests__/ga4-property-selection.test.ts`)
   - Tests MUST cover the exact regression scenario
   - Never skip or disable these tests
   - Add new tests when adding dealerships

## 📋 Adding New Dealerships

### Step 1: Generate Template
```bash
npm run validate:mappings:template
```

### Step 2: Add to Mapping File
```typescript
{
  dealershipId: 'dealer-new-dealership',
  dealershipName: 'New Dealership Name',
  ga4PropertyId: '123456789', // UNIQUE property ID
  searchConsoleUrl: 'https://www.newdealership.com/',
  hasAccess: true
}
```

### Step 3: Validate
```bash
npm run validate:mappings
```

### Step 4: Test
```bash
npm run test:ga4
```

### Step 5: Commit (pre-commit hooks will run automatically)

## 🔍 Monitoring & Troubleshooting

### Check Data Integrity
```bash
# Local development
curl http://localhost:3000/api/admin/ga4-integrity | jq .

# Production (replace with your domain)
curl https://your-domain.com/api/admin/ga4-integrity | jq .
```

### Expected Healthy Response
```json
{
  "status": "healthy",
  "summary": {
    "totalDealerships": 15,
    "uniqueProperties": 15,
    "suspiciousPatterns": 0
  }
}
```

### Warning Response (Action Required)
```json
{
  "status": "warning",
  "summary": {
    "suspiciousPatterns": 2
  },
  "details": {
    "suspiciousPatterns": [
      {
        "propertyId": "320759942",
        "affectedDealerships": ["dealer-acura-columbus", "dealer-genesis-wichita"],
        "identicalData": { "sessions": 1000, "users": 800 },
        "severity": "critical"
      }
    ]
  }
}
```

## 🚨 Emergency Response

### If All Dealerships Show Same Data:

1. **Immediate Check**:
   ```bash
   npm run test:ga4
   ```

2. **Check Recent Changes**:
   ```bash
   git log --oneline -10 lib/google/dealership-analytics-service.ts
   ```

3. **Validate Mappings**:
   ```bash
   npm run validate:mappings
   ```

4. **Check Production Status**:
   ```bash
   curl https://your-domain.com/api/admin/ga4-integrity
   ```

5. **Revert if Necessary**:
   ```bash
   git revert <problematic-commit>
   ```

## 📊 Key Metrics to Monitor

- **Unique Properties**: Should equal number of active dealerships
- **Suspicious Patterns**: Should be 0
- **Property ID Distribution**: Each dealership should use its mapped property
- **Data Variance**: Sessions/users should vary significantly between dealerships

## 🔧 Maintenance

### Weekly
- Check integrity endpoint for warnings
- Review any new suspicious patterns

### Before Major Releases
- Run full test suite: `npm run test:ga4`
- Validate all mappings: `npm run validate:mappings`
- Check production integrity status

### When Adding Dealerships
- Follow the 5-step process above
- Monitor for 24 hours after deployment
- Verify unique data is showing for new dealership

## 🎯 Success Criteria

✅ Each dealership shows unique GA4 data  
✅ Property selection tests pass  
✅ Mapping validation passes  
✅ No suspicious patterns in monitoring  
✅ Pre-commit hooks prevent regressions  

This system ensures that the GA4 property selection logic remains robust and prevents the critical regression where all accounts show identical data.
