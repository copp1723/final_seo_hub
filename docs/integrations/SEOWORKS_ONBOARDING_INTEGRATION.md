# SEOWorks Onboarding Integration

## Overview

This document describes the bidirectional integration between Rylie SEO Hub and SEOWorks for automated client onboarding. Jeff's system can now push client onboarding data directly to our platform, creating users and initial setup requests automatically.

## Integration Flow

```
Jeff's System → SEOWorks API → Our Onboarding Endpoint → User Creation → Setup Request
```

## Jeff's Onboarding Endpoint

**URL**: `https://api.seowerks.ai/rylie-onboard.cfm`
**Method**: POST
**Authentication**: API Key in header

### Request Format

```bash
curl -X POST https://api.seowerks.ai/rylie-onboard.cfm \
  -H "Content-Type: application/json" \
  -H "x-api-key: 7f3e9b5d2a8c4f6e1b9d3c7a5e8f2b4d6c9a1e3f7b5d9c2a6e4f8b1d3c7a9e5f" \
  -d '{
    "timestamp": "2024-07-03T10:30:00Z",
    "businessName": "Jay Hatfield Chevrolet of Vinita",
    "clientId": "user_jayhatfieldchevy_vinita_2024",
    "clientEmail": "manager@jayhatfieldchevyvinita.com",
    "package": "GOLD",
    "mainBrand": "Chevrolet",
    "otherBrand": "",
    "address": "1001 N 7th St",
    "city": "Vinita",
    "state": "OK",
    "zipCode": "74301",
    "contactName": "Jane Smith",
    "contactTitle": "General Manager",
    "email": "manager@jayhatfieldchevyvinita.com",
    "phone": "(918) 256-7531",
    "websiteUrl": "https://jayhatfieldchevyvinita.com",
    "billingEmail": "billing@jayhatfieldchevyvinita.com",
    "siteAccessNotes": "",
    "targetVehicleModels": "Chevrolet Silverado;Chevrolet Traverse;Chevrolet Blazer",
    "targetCities": "Vinita;Miami;Pryor",
    "targetDealers": "Competitor Chevy Vinita;City Motors Vinita;Premier Chevrolet Vinita"
  }'
```

### Response Format

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "message": "Received Onboarding Data"
  }
}
```

## Our Onboarding Endpoint

**URL**: `https://rylie-seo-hub.onrender.com/api/seoworks/onboard`
**Method**: POST
**Authentication**: API Key in header (same as Jeff's)

### What Our Endpoint Does

1. **Validates API Key**: Ensures request is from authorized SEOWorks system
2. **Creates/Updates User**: 
   - Creates new user if email doesn't exist
   - Updates existing user with new package info
   - Sets onboarding as completed
   - Configures billing period
3. **Transforms Data**:
   - Converts target cities from "City1;City2" to "City1, State;City2, State" format
   - Splits semicolon-separated lists into arrays
   - Maps package types to our enum values
4. **Creates Setup Request**:
   - Initial SEO setup request with all onboarding data
   - Stores business details in description and completedTasks field
   - Sets up SEO targeting data (cities, models, keywords)

### Data Transformations

| Jeff's Format | Our Format | Notes |
|---------------|------------|-------|
| `"targetCities": "Vinita;Miami;Pryor"` | `["Vinita, OK", "Miami, OK", "Pryor, OK"]` | Adds state code for consistency |
| `"targetVehicleModels": "Silverado;Traverse"` | `["Chevrolet Silverado", "Chevrolet Traverse"]` | Split into array |
| `"package": "GOLD"` | `PackageType.GOLD` | Maps to enum |

### Response Format

```json
{
  "success": true,
  "data": {
    "message": "Onboarding completed successfully",
    "userId": "cm123abc...",
    "requestId": "cm456def...",
    "clientId": "user_jayhatfieldchevy_vinita_2024",
    "businessName": "Jay Hatfield Chevrolet of Vinita",
    "package": "GOLD",
    "targetCities": ["Vinita, OK", "Miami, OK", "Pryor, OK"],
    "targetModels": ["Chevrolet Silverado", "Chevrolet Traverse", "Chevrolet Blazer"]
  }
}
```

## Key Features

### 1. Target Cities Format Handling
- **Issue**: Jeff sends city names only, but our forms require "City, State" format
- **Solution**: Automatically append state code from address data
- **Example**: "Vinita;Miami" → ["Vinita, OK", "Miami, OK"]

### 2. Duplicate User Handling
- **Existing User**: Updates package type and billing period
- **New User**: Creates complete user profile with onboarding data

### 3. Comprehensive Data Storage
- **User Profile**: Contact info, package type, billing period
- **Setup Request**: Business details, SEO targeting, onboarding metadata
- **SEO Data**: Keywords (vehicle models), target cities, target models

### 4. Authentication
- Uses same API key as Jeff's system for consistency
- Added to middleware public routes for external access

## Testing

### Test Script
```bash
node scripts/test-seoworks-onboarding.js
```

This script tests:
- ✅ Jeff's endpoint connectivity
- ✅ Our local endpoint (if running)
- ✅ Our production endpoint

### Manual Testing

**Test Jeff's Endpoint**:
```bash
curl -X POST https://api.seowerks.ai/rylie-onboard.cfm \
  -H "Content-Type: application/json" \
  -H "x-api-key: 7f3e9b5d2a8c4f6e1b9d3c7a5e8f2b4d6c9a1e3f7b5d9c2a6e4f8b1d3c7a9e5f" \
  -d '{"timestamp":"2024-07-03T10:30:00Z","businessName":"Test Business",...}'
```

**Test Our Endpoint**:
```bash
curl -X POST https://rylie-seo-hub.onrender.com/api/seoworks/onboard \
  -H "Content-Type: application/json" \
  -H "x-api-key: 7f3e9b5d2a8c4f6e1b9d3c7a5e8f2b4d6c9a1e3f7b5d9c2a6e4f8b1d3c7a9e5f" \
  -d '{"timestamp":"2024-07-03T10:30:00Z","businessName":"Test Business",...}'
```

## Implementation Files

### Core Endpoint
- **File**: [`app/api/seoworks/onboard/route.ts`](../app/api/seoworks/onboard/route.ts)
- **Purpose**: Receives and processes onboarding data from SEOWorks

### Middleware Configuration
- **File**: [`middleware.ts`](../middleware.ts)
- **Change**: Added `/api/seoworks/onboard` to public routes

### Testing Utilities
- **File**: [`scripts/test-seoworks-onboarding.js`](../scripts/test-seoworks-onboarding.js)
- **Purpose**: Comprehensive testing of both endpoints

## Security Considerations

1. **API Key Authentication**: Validates requests using shared secret
2. **Input Validation**: Validates all required fields and data types
3. **Error Handling**: Logs errors without exposing sensitive information
4. **Rate Limiting**: Inherits from application-wide rate limiting

## Monitoring and Logging

All onboarding events are logged with:
- Client identification (clientId, businessName)
- User creation/update status
- Request creation details
- Any errors or warnings

**Log Examples**:
```
[INFO] SEOWorks onboarding received { clientId: "user_...", businessName: "...", package: "GOLD" }
[INFO] SEOWorks onboarding: New user created { userId: "cm123...", email: "...", name: "..." }
[INFO] SEOWorks onboarding: Setup request created { requestId: "cm456...", userId: "cm123...", businessName: "..." }
```

## Next Steps

1. **Deploy to Production**: Changes are committed and will deploy automatically
2. **Test Integration**: Use test script to verify both endpoints work
3. **Coordinate with Jeff**: Confirm he can start sending live onboarding data
4. **Monitor Logs**: Watch for successful onboarding events and any errors

## Troubleshooting

### Common Issues

**401 Unauthorized**:
- Check API key in `x-api-key` header
- Ensure key matches exactly: `7f3e9b5d2a8c4f6e1b9d3c7a5e8f2b4d6c9a1e3f7b5d9c2a6e4f8b1d3c7a9e5f`

**500 Internal Server Error**:
- Check database connectivity
- Verify all required fields are provided
- Check application logs for specific error details

**Target Cities Format**:
- Our system automatically converts "City1;City2" to "City1, State;City2, State"
- State is extracted from the `state` field in the payload

## Integration Status

- [x] Jeff's endpoint tested and working
- [x] Our onboarding endpoint created
- [x] Middleware configured for public access
- [x] Data transformation logic implemented
- [x] Testing utilities created
- [x] Documentation completed
- [ ] **PENDING**: Deploy to production
- [ ] **PENDING**: End-to-end testing with Jeff
- [ ] **PENDING**: Go live with real onboarding data

**The onboarding integration is ready for production deployment and testing!**