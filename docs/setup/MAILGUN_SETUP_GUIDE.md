# Mailgun Setup Guide for CSV Dealership Onboarding

## Overview
This guide explains how to configure Mailgun to route emails with CSV attachments to your webhook endpoint for automatic dealership creation.

## Prerequisites
- Mailgun account with verified domain
- Environment variables already configured:
  ```env
  MAILGUN_WEBHOOK_SIGNING_KEY=31420435df8ff885a971b2eab64ba00e
  MAILGUN_CSV_WEBHOOK_URL=https://rylie-seo-hub.onrender.com/api/mailgun/dealership-csv
  ```

## Mailgun Configuration Steps

### 1. Choose an Email Address for CSV Processing
Pick any email address on your verified domain for CSV processing, such as:
- `csv@yourdomain.com`
- `dealerships@yourdomain.com`
- `onboarding@yourdomain.com`

**Note**: You don't need to "create" this email address in Mailgun. Any email address on your verified domain will automatically work once you set up the routing rule below.

### 2. Set Up Email Routing
In your Mailgun dashboard:

1. Go to **Receiving** → **Routes**
2. Click **Create Route**
3. Configure the route:
   - **Expression**: `match_recipient("csv@yourdomain.com")`
   - **Actions**: 
     - `forward("https://rylie-seo-hub.onrender.com/api/mailgun/dealership-csv")`
     - `stop()`

### 3. Configure Webhook Settings
1. Go to **Settings** → **Webhooks**
2. Add webhook for your domain:
   - **URL**: `https://rylie-seo-hub.onrender.com/api/mailgun/dealership-csv`
   - **Events**: Select `delivered` (optional, for monitoring)

### 4. Verify Webhook Signature
The webhook endpoint automatically verifies Mailgun signatures using:
```env
MAILGUN_WEBHOOK_SIGNING_KEY=31420435df8ff885a971b2eab64ba00e
```

## Email Format for Users

### To Send CSV Files:
1. **To**: `csv@yourdomain.com` (or your chosen address)
2. **Subject**: Any descriptive subject
3. **Attachment**: CSV file with dealership data
4. **From**: Must be from an authorized agency admin email

### Example Email:
```
To: csv@yourdomain.com
Subject: New Dealerships for ABC Agency
Attachment: dealerships.csv

Hi,

Please process the attached CSV file to create new dealerships for our agency.

Thanks!
```

## CSV File Requirements

### Required Format:
```csv
name,website,ga4PropertyId,searchConsoleUrl
"ABC Motors","https://abcmotors.com","GA4-123456789","https://abcmotors.com"
"XYZ Auto Group","https://xyzauto.com","","https://xyzauto.com"
```

### Validation Rules:
- File must be `.csv` format
- Maximum 5MB file size
- Maximum 100 dealerships per file
- Required headers: `name,website,ga4PropertyId,searchConsoleUrl`
- Only `name` field is required (others can be empty)

## Security Features

### Authentication:
- Mailgun webhook signature verification
- Sender email must be in system database
- Sender must have `AGENCY_ADMIN` or `SUPER_ADMIN` role
- Sender must be associated with an agency

### Rate Limiting:
- Maximum 5 CSV processing requests per hour per email address
- Prevents system abuse

### File Validation:
- File type and size restrictions
- Malicious content scanning
- CSV format validation

## Testing the Setup

### 1. Test Webhook Endpoint
```bash
curl -X GET https://rylie-seo-hub.onrender.com/api/mailgun/dealership-csv
```
Should return:
```json
{
  "success": true,
  "data": {
    "message": "Dealership CSV webhook endpoint is active",
    "timestamp": "2025-01-11T04:43:00.000Z"
  }
}
```

### 2. Test Email Processing
1. Send a test email with CSV attachment to your configured address
2. Check application logs for processing status
3. Verify confirmation email is received

## Monitoring & Troubleshooting

### Check Logs:
- Application logs will show webhook processing
- Mailgun logs show email delivery status
- Audit logs track all CSV processing attempts

### Common Issues:

| Issue | Cause | Solution |
|-------|-------|----------|
| No webhook triggered | Email routing not configured | Check Mailgun routes |
| Signature verification failed | Wrong signing key | Verify `MAILGUN_WEBHOOK_SIGNING_KEY` |
| Unauthorized sender | User not in system | Add user to database with correct role |
| File not processed | Wrong file format | Use `.csv` extension and correct headers |

### Debug Steps:
1. Check Mailgun delivery logs
2. Verify webhook endpoint is accessible
3. Check application logs for errors
4. Verify sender email exists in user database
5. Confirm CSV file format matches template

## Production Considerations

### Security:
- Use HTTPS for all webhook URLs
- Regularly rotate webhook signing keys
- Monitor for suspicious activity
- Implement additional rate limiting if needed

### Monitoring:
- Set up alerts for webhook failures
- Monitor CSV processing success rates
- Track file upload patterns
- Log all security events

### Backup:
- Store processed CSV files for audit
- Backup processing logs
- Maintain user activity records

## Support

For issues with:
- **Mailgun configuration**: Check Mailgun documentation
- **Webhook processing**: Check application logs
- **CSV format**: Use provided template
- **User permissions**: Contact system administrator

## Next Steps

After setup:
1. Test with a small CSV file
2. Train agency staff on email format
3. Distribute CSV template
4. Monitor initial usage
5. Gather feedback for improvements

The system is now ready to automatically process CSV files sent via email!