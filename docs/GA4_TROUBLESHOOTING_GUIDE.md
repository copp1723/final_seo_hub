# GA4 Troubleshooting Guide

## Debug Endpoints Created

I've created several debug endpoints to help diagnose why GA4 data isn't showing:

### 1. Check GA4 Connection Status
```bash
GET /api/debug/ga4-status
```
This endpoint will show:
- Your current property ID and name
- Whether tokens are stored
- A test query to verify API access
- Any errors encountered

### 2. Test GA4 Metrics
```bash
GET /api/debug/test-ga4-metrics
```
This endpoint tests all common GA4 metrics to see which ones work with your property.

### 3. Manual GA4 Test
```bash
POST /api/debug/test-manual-ga4
{
  "propertyId": "320759942",
  "startDate": "2024-01-01", 
  "endDate": "2024-01-31"
}
```
Test with your specific property IDs:
- Jay Hatfield Chevrolet: 320759942
- Jay Hatfield Motorsports: 317592148

## Common Issues & Solutions

### 1. No Data Showing
- **Check the correct tab**: Make sure you're on the "Traffic Analytics" tab in reporting
- **Date range**: Ensure the date range has data (try "Last 30 days")
- **Property ID**: Verify the correct property is selected in Settings > GA4

### 2. Authentication Issues
- The enhanced logging will show authentication errors in your server logs
- Try disconnecting and reconnecting GA4 in settings
- Make sure to select the correct property after reconnecting

### 3. API Permissions
When reconnecting GA4, ensure you grant these permissions:
- View and manage your Google Analytics data
- See and download your Google Analytics data

### 4. Checking Logs
The enhanced logging will show:
1. When requests are made
2. Which property ID is being used
3. How many rows of data are returned
4. Any errors encountered

## Next Steps

1. **Check your server logs** after trying to load the reporting page
2. **Use the debug endpoints** to verify:
   - GA4 is connected properly
   - The correct property ID is stored
   - The API can fetch data

3. **Try the manual test endpoint** with your property IDs to see if data is available

The logs should now provide detailed information about what's happening when you try to fetch GA4 data. 