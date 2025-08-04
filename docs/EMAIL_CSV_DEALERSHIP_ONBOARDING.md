# Email-Based CSV Dealership Onboarding

This feature allows authorized agency staff to create multiple dealerships by emailing a CSV file to the system.

## Overview

Instead of manually uploading CSV files through the web interface, agency administrators can now:
1. Prepare a CSV file with dealership data
2. Email it to the configured Mailgun webhook address
3. Receive automatic confirmation with results

## Who Can Use This Feature

- **Agency Admins** (`AGENCY_ADMIN` role)
- **Super Admins** (`SUPER_ADMIN` role)

Only users with these roles and an associated agency can create dealerships via email.

## CSV Format Requirements

### Required Headers
The CSV file must contain exactly these headers (case-sensitive):
```csv
name,website,ga4PropertyId,searchConsoleUrl
```

### Field Descriptions

| Field | Required | Description | Example |
|-------|----------|-------------|---------|
| `name` | ✅ Yes | Dealership name (max 100 characters) | "ABC Motors" |
| `website` | ❌ No | Dealership website URL | "https://abcmotors.com" |
| `ga4PropertyId` | ❌ No | Google Analytics 4 Property ID | "GA4-123456789" |
| `searchConsoleUrl` | ❌ No | Search Console site URL | "https://abcmotors.com" |

### Example CSV Content
```csv
name,website,ga4PropertyId,searchConsoleUrl
"ABC Motors","https://abcmotors.com","GA4-123456789","https://abcmotors.com"
"XYZ Auto Group","https://xyzauto.com","","https://xyzauto.com"
"Quick Lube Express","","GA4-987654321",""
```

## File Requirements

- **Format**: CSV files only (`.csv` extension)
- **Size**: Maximum 5MB
- **Rows**: Maximum 100 dealerships per file
- **Encoding**: UTF-8 recommended

## How to Use

### Step 1: Prepare Your CSV File
1. Download the template: [dealership-template.csv](/templates/dealership-template.csv)
2. Fill in your dealership data
3. Save as a `.csv` file

### Step 2: Send Email
1. Compose a new email
2. **To**: `[MAILGUN_WEBHOOK_EMAIL]` (configured by system admin)
3. **Subject**: Any subject (e.g., "New Dealerships for ABC Agency")
4. **Attachment**: Your CSV file
5. Send the email

### Step 3: Receive Confirmation
You'll receive an email confirmation with:
- Processing summary (total, successful, failed)
- List of created dealerships
- Details of any errors

## Security Features

### Authentication
- Mailgun webhook signature verification
- Sender email validation against user database
- Role-based access control

### File Validation
- File type and size limits
- Malicious content scanning
- CSV format validation
- Header validation

### Rate Limiting
- Maximum 5 requests per hour per email address
- Prevents system abuse

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Unauthorized sender" | Email not in system or insufficient role | Contact admin to verify account |
| "No CSV file found" | Missing or wrong file type | Attach a `.csv` file |
| "Missing required headers" | Incorrect CSV format | Use the provided template |
| "Dealership already exists" | Duplicate name in agency | Use unique dealership names |
| "Rate limit exceeded" | Too many requests | Wait 1 hour before trying again |

### Partial Success
If some rows fail while others succeed:
- Successfully created dealerships will be saved
- Failed rows will be listed in the error email
- You can fix errors and re-send only the failed rows

## Integration Details

### GA4 Connections
When `ga4PropertyId` is provided:
- Creates a GA4 connection record
- Tokens will be set when user connects via UI
- Property name: `"{Dealership Name} - GA4"`

### Search Console Connections
When `searchConsoleUrl` is provided:
- Creates a Search Console connection record
- Tokens will be set when user connects via UI
- Site name: `"{Dealership Name} - Search Console"`

## Monitoring & Audit

All CSV processing activities are logged with:
- Sender email and agency
- File details (name, size)
- Processing results
- Error details
- Timestamps

## Environment Setup

### Required Environment Variables
```env
MAILGUN_WEBHOOK_SIGNING_KEY=your_signing_key
MAILGUN_API_KEY=your_api_key
MAILGUN_DOMAIN=your_domain
```

### Mailgun Configuration
1. Set up webhook endpoint: `/api/mailgun/dealership-csv`
2. Configure email routing to webhook
3. Enable signature verification

## Troubleshooting

### Email Not Processing
1. Check sender email is in system
2. Verify user has correct role
3. Ensure CSV file is attached
4. Check file format and headers

### Processing Errors
1. Review error email for specific issues
2. Validate CSV format against template
3. Check for duplicate dealership names
4. Verify URLs are properly formatted

### Rate Limiting
- Wait 1 hour between requests
- Contact admin if higher limits needed

## Support

For technical issues or questions:
1. Check this documentation
2. Review error emails for specific guidance
3. Contact system administrator
4. Check audit logs for processing details

## Security Considerations

- Only send CSV files from trusted sources
- Verify dealership data before sending
- Don't include sensitive information in CSV
- Report suspicious activity to admin

## Future Enhancements

Planned improvements:
- Bulk user creation alongside dealerships
- Custom field mapping
- Scheduled processing
- Enhanced error reporting
- API endpoint for programmatic access