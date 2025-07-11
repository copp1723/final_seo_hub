# GA4 Data Discrepancy Debug Plan

## Immediate Actions

1. **Run Full Diagnostic**
   - Access: `/api/debug/ga4-full-diagnostic`
   - This will show exactly what data GA4 API is returning
   - Compare with SEO company's numbers

2. **Check These Specific Issues**

### Metric Name Mismatches
- Your code uses `activeUsers` but interface expects `users`
- Some properties use `pageviews` vs `screenPageViews`
- Check if your property uses different metric names

### Date Range Issues
- GA4 API uses property timezone
- Dashboard might be using different timezone
- Verify date ranges match exactly

### Data Processing Errors
- Check if data aggregation is correct
- Verify array summing logic
- Look for null/undefined values

## Debug Steps

1. **Compare Raw Data**
   ```bash
   # Get diagnostic data
   curl -X GET /api/debug/ga4-full-diagnostic
   
   # Check what metrics work for your property
   # Look at the "workingMetrics" array
   ```

2. **Test Specific Date Range**
   ```bash
   # Test same date range as SEO company
   curl -X POST /api/ga4/analytics \
     -H "Content-Type: application/json" \
     -d '{"startDate":"2024-01-01","endDate":"2024-01-31"}'
   ```

3. **Check Property Configuration**
   - Verify correct GA4 property is selected
   - Ensure property has web data stream
   - Check enhanced measurement settings

## Common Fixes

### Fix 1: Update Metric Names
If diagnostic shows different working metrics, update the analytics route to use correct names.

### Fix 2: Fix Date Timezone
Ensure all date processing uses same timezone as GA4 property.

### Fix 3: Update Data Processing
Fix aggregation logic to handle edge cases and null values properly.

## Next Steps

1. Run diagnostic first
2. Share results with SEO company
3. Compare exact numbers and date ranges
4. Implement fixes based on findings