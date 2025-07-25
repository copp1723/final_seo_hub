# Jay Hatfield Dealership Bulk Creation with Client IDs

This document explains how to bulk create all 22 Jay Hatfield dealerships with unique client IDs for SEOWorks integration.

## What This Does

- ✅ Creates all 22 dealerships in the SEOWorks agency
- ✅ Generates unique client IDs following the pattern: `user_{business_name_simplified}_{location}_{year}`
- ✅ Includes GA4 property IDs and website information
- ✅ Sets up client emails for each dealership
- ✅ Handles both new creation and updates to existing dealerships

## Quick Start

### 1. Run the Bulk Creation Script

```bash
cd /path/to/your/seo-hub
npx ts-node scripts/bulk-create-jay-hatfield-dealerships-with-clientid.ts
```

### 2. Verify Everything Worked

```bash
npx ts-node scripts/verify-dealerships.ts
```

## Example Client IDs Generated

Here are some examples of the client IDs that get generated:

| Dealership Name | Client ID | Pattern Explained |
|----------------|-----------|-------------------|
| Jay Hatfield Motorsports of Wichita | `user_jayhatfieldmotorsofwichita_wichita_2024` | business_name + location + year |
| Sarcoxie Ford | `user_sarcoxieford_sarcoxieford_2024` | simplified name + extracted domain + year |
| Premier Auto Center - Tucson | `user_premierautocentertucson_tucson_2024` | cleaned name + location + year |

## What Gets Created

### All 22 Dealerships:

1. **Jay Hatfield Chevrolet of Columbus** - `user_jayhatfieldchevyofcolumbus_columbus_2024`
2. **Jay Hatfield Chevrolet GMC of Chanute** - `user_jayhatfieldchevygmcofchanute_chanute_2024`
3. **Jay Hatfield Chevrolet GMC of Pittsburg** - `user_jayhatfieldchevygmcofpittsburg_pittsburg_2024`
4. **Jay Hatfield Chevrolet of Vinita** - `user_jayhatfieldchevyofvinita_vinita_2024`
5. **Jay Hatfield CDJR of Frontenac** - `user_jayhatfieldcdjroffrontenac_frontenac_2024`
6. **Sarcoxie Ford** - `user_sarcoxieford_sarcoxieford_2024`
7. **Jay Hatfield Honda Powerhouse** - `user_jayhatfieldhonda_jayhatfieldhondawichita_2024`
8. **Jay Hatfield Motorsports of Wichita** - `user_jayhatfieldmotorsofwichita_wichita_2024`
9. **Jay Hatfield Motorsports of Frontenac** - `user_jayhatfieldmotorsoffrontenac_frontenac_2024`
10. **Jay Hatfield Motorsports of Joplin** - `user_jayhatfieldmotorsofjoplin_joplin_2024`
11. **Acura of Columbus** - `user_acuraofcolumbus_columbus_2024`
12. **Genesis of Wichita** - `user_genesisofwichita_wichita_2024`
13. **Jay Hatfield Motorsports Portal** - `user_jayhatfieldmotorsportal_jayhatfieldmotorsports_2024`
14. **Jay Hatfield Motorsports Ottawa** - `user_jayhatfieldmotorsottawa_jayhatfieldottawa_2024`
15. **Hatchett Hyundai East** - `user_hatchetthyundaieast_hatchetthyundaieast_2024`
16. **Hatchett Hyundai West** - `user_hatchetthyundaiwest_hatchetthyundaiwest_2024`
17. **Premier Mitsubishi** - `user_premiermitsubishi_premiermitsubishi_2024`
18. **Premier Auto Center - Tucson** - `user_premierautocentertucson_tucson_2024`
19. **World Kia** - `user_worldkia_worldkiajoliet_2024`
20. **AEO Powersports** - `user_aeopowersports_aeopowersports_2024`
21. **Columbus Auto Group** - `user_columbusautogroup_columbusautogroup_2024`
22. **Winnebago of Rockford** - `user_winnebagoofrockford_rockford_2024`

## SEOWorks Integration

### Example Webhook Payload

Use the generated client IDs in your SEOWorks webhook payloads:

```json
{
  "clientId": "user_jayhatfieldmotorsofwichita_wichita_2024",
  "clientEmail": "manager@kansasmotorsports.com",
  "businessName": "Jay Hatfield Motorsports of Wichita",
  "websiteUrl": "https://www.kansasmotorsports.com",
  "ga4PropertyId": "317592148",
  "ga4MeasurementId": "G-DBMQEB1TM0"
}
```

### Key Benefits for SEOWorks

1. **Unique Identification** - Each dealership has a guaranteed unique client ID
2. **Consistent Format** - All IDs follow the same pattern for easy parsing
3. **Location Tracking** - Client IDs include location information
4. **Easy Integration** - Can be used directly in webhook payloads

## Database Schema Changes

The script automatically adds a `clientId` field to the `dealerships` table:

```sql
ALTER TABLE dealerships ADD COLUMN clientId VARCHAR UNIQUE;
```

## Troubleshooting

### If the SEOWorks Agency Doesn't Exist

The script will show an error if it can't find the SEOWorks agency. Make sure you have:

1. An agency with "SEO" or "SEOWERKS" in the name
2. Or an agency with "seowerks" in the domain

### If Some Dealerships Already Exist

The script handles this gracefully by:
- Updating existing dealerships with client IDs
- Creating new dealerships that don't exist
- Showing a summary of what was created vs updated

### Re-running the Script

It's safe to re-run the script multiple times. It will:
- Skip dealerships that already exist and have client IDs
- Update dealerships that exist but are missing client IDs
- Create any missing dealerships

## Files Created

- `scripts/bulk-create-jay-hatfield-dealerships-with-clientid.ts` - Main creation script
- `scripts/verify-dealerships.ts` - Verification script
- `scripts/README-jay-hatfield-bulk-creation.md` - This documentation

## Support

If you encounter any issues:

1. Check that your database connection is working
2. Verify the SEOWorks agency exists
3. Check the console output for specific error messages
4. Re-run the verification script to see the current state

## Next Steps

After running the script:

1. ✅ Test your app's dealership dropdown to see all 22 dealerships
2. ✅ Send the client ID mapping to SEOWorks for webhook integration  
3. ✅ Configure your SEOWorks webhook payloads to use the client IDs
4. ✅ Test webhook delivery with the new client IDs 