# GA4 Data Not Showing - Technical Diagnostic Guide

## Run Full Diagnostic First

```bash
GET /api/debug/ga4-full-diagnostic
```

This comprehensive diagnostic will:
- Test your GA4 connection with actual API calls
- Show exactly what data is (or isn't) being returned
- Check multiple date ranges
- Test different metrics to see which work
- Provide specific recommendations based on findings

## What the Diagnostic Reveals

### If "hasDataInLastWeek" is false:
- Your property ID is correct but the property has no tracking data
- Possible causes:
  - GA4 tracking code not installed on the website
  - Wrong property selected (dev vs production)
  - New property with no data yet

### If API calls succeed but return 0 sessions:
- The connection works but no traffic is recorded
- Check if the GA4 measurement ID on your site matches this property

### If certain metrics fail:
- Some properties use different metric names
- The diagnostic will show which metrics work for your property

## Other Debug Endpoints

### Test Specific Property IDs
```bash
POST /api/debug/test-manual-ga4
{
  "propertyId": "320759942",
  "startDate": "2024-01-01", 
  "endDate": "2024-01-31"
}
```

### Check Current Connection
```bash
GET /api/debug/ga4-status
```

### Test Available Metrics
```bash
GET /api/debug/test-ga4-metrics
```

## Common Technical Issues

### 1. Empty Data Despite Successful API Calls
- The reporting page shows 0s because the API returns empty rows
- Run the diagnostic to see raw API responses

### 2. Metric Name Mismatches
- GA4 uses `activeUsers` not `users`
- Some properties use `pageviews` instead of `screenPageViews`
- The diagnostic will identify which metrics work

### 3. Property Configuration Issues
- Ensure the property has a web data stream configured
- Check that enhanced measurement is enabled in GA4

### 4. Date Range Issues
- New properties won't have historical data
- Test with recent dates using the manual test endpoint

## After Running Diagnostics

The diagnostic will give you:
1. Exact error messages from the GA4 API
2. Which metrics are available for your property
3. Whether any data exists in various date ranges
4. Specific recommendations based on the findings

With this information, we can fix the exact issue rather than guessing. 