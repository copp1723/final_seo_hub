# Production Log Analysis Guide

## 🔍 What to Look For in Render Logs

### **Access Your Logs**
1. Go to your Render dashboard
2. Select your `rylie-seo-hub` service
3. Click on "Logs" tab
4. Set time range to "Last 1 hour" or "Last 24 hours"

### **🚨 Critical Error Patterns to Search For**

#### **1. Dealership Filtering Errors**
Search for these terms in your logs:
```
dealershipId
dealership switching
dealership change
No dealership-specific GA4 mapping found
```

**What to look for:**
- `⚠️ No dealership-specific GA4 mapping found for [dealership-id]`
- `🎯 GA4 Property mapping for [dealership-id]: null`
- `Error switching dealership`

#### **2. GA4 API Errors**
Search for:
```
GA4
Google Analytics
403
401
quota
rate limit
```

**What to look for:**
- `403 Forbidden` - Service account lacks access
- `401 Unauthorized` - Authentication issues
- `Quota exceeded` - API rate limits
- `Property not found` - Wrong property ID

#### **3. Database Errors**
Search for:
```
prisma
database
dealership not found
foreign key
```

**What to look for:**
- `Dealership not found`
- `Foreign key constraint`
- `Database connection error`

#### **4. Cache Issues**
Search for:
```
cache
redis
invalidat
```

**What to look for:**
- `Cache invalidation failed`
- `Redis connection error`
- `Serving stale cache`

### **📋 Log Analysis Checklist**

When you find relevant log entries, note:

- [ ] **Timestamp** - When did the error occur?
- [ ] **User ID** - Which user experienced the issue?
- [ ] **Dealership ID** - What dealership were they trying to access?
- [ ] **Error Message** - Exact error text
- [ ] **Stack Trace** - Full error details if available

### **🎯 Most Important Log Entries**

Look specifically for these patterns that indicate the root cause:

#### **Pattern 1: Mapping Not Found (Most Likely)**
```
⚠️ No dealership-specific GA4 mapping found for abc-123-def, falling back to user connection
🎯 GA4 Property mapping for abc-123-def: null
```
**This means:** Database dealership IDs don't match hardcoded mappings

#### **Pattern 2: Service Account Access Issues**
```
403 Forbidden: Request had insufficient authentication scopes
GA4 service account lacks access to property 123456789
```
**This means:** Service account needs to be added to GA4 properties

#### **Pattern 3: Database Inconsistency**
```
Dealership not found
User is not associated with an agency
Access denied to requested dealership
```
**This means:** Database relationships are broken

#### **Pattern 4: Cache Serving Wrong Data**
```
Returning cached dashboard analytics data
Cache key: dashboard_analytics_user123_30days_dealership456
```
**This means:** Cache might be serving stale cross-dealership data

### **🚀 Quick Log Search Commands**

If you have command-line access to logs, search for:

```bash
# Search for dealership-related errors
grep -i "dealership" logs.txt | grep -i "error\|warn\|fail"

# Search for GA4 issues
grep -i "ga4\|google analytics" logs.txt | grep -i "403\|401\|error"

# Search for mapping issues
grep -i "mapping\|property.*not found" logs.txt

# Search for cache issues
grep -i "cache.*error\|redis.*error" logs.txt
```

### **📊 Expected vs Problem Log Patterns**

#### **✅ GOOD - Working Dealership Switch:**
```
Dealership switched successfully from dealer-abc to dealer-xyz
✅ Using dealership-specific GA4 property 123456789 for dealer-xyz
Analytics cache invalidated for user123, dealership dealer-abc
```

#### **❌ BAD - Broken Dealership Switch:**
```
⚠️ No dealership-specific GA4 mapping found for 550e8400-e29b-41d4-a716-446655440000
Falling back to user connection
Same GA4 property used for all dealerships
```

### **🎯 Next Steps Based on Log Findings**

**If you see mapping errors:**
- Run the database diagnosis queries
- Fix dealership ID mismatches

**If you see 403/401 errors:**
- Check service account permissions
- Verify GA4 property access

**If you see cache errors:**
- Clear production cache
- Restart the service

**If you see database errors:**
- Check user-dealership associations
- Verify agency relationships

---

## 📝 Report Template

When you check the logs, fill this out:

```
🔍 PRODUCTION LOG ANALYSIS RESULTS

Time Range Checked: ___________
Total Log Entries: ___________

❌ ERRORS FOUND:
- [ ] Dealership mapping errors
- [ ] GA4 API errors  
- [ ] Database errors
- [ ] Cache errors
- [ ] Other: ___________

🎯 MOST CRITICAL ERROR:
Error Message: ___________
Timestamp: ___________
Frequency: ___________

🔧 RECOMMENDED FIX:
Based on logs: ___________
```
