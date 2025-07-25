# Multi-Brand Auto Group Dealership Setup

This folder contains scripts to set up all 22 dealerships across multiple automotive brands in your SEO Hub database.

## Files Created

- `setup-all-dealerships.js` - **Main Node.js script** (RECOMMENDED)
- `setup-jay-hatfield-dealerships.js` - Previous version (Jay Hatfield focused)
- `create-jay-hatfield-dealerships.sql` - Manual SQL script for dealerships
- `create-jay-hatfield-users.sql` - Manual SQL script for users  
- `setup-dealerships.sh` - Bash script wrapper
- This README file

## Quick Setup (Recommended)

**Option 1: Run the updated automated script**
```bash
# Make sure your database is connected first
node scripts/setup-all-dealerships.js
```

**Option 2: Run with the bash wrapper**
```bash
chmod +x scripts/setup-dealerships.sh
./scripts/setup-dealerships.sh
```

## What Gets Created

### 1. Agency
- **Name**: Multi-Brand Auto Group
- **Domain**: autogroup.com
- **Admin User**: admin@autogroup.com

### 2. All 22 Dealerships Across Multiple Brands

**Jay Hatfield Locations:**
- Jay Hatfield Chevrolet of Columbus
- Jay Hatfield Chevrolet GMC of Chanute
- Jay Hatfield Chevrolet GMC of Pittsburg
- Jay Hatfield Chevrolet of Vinita
- Jay Hatfield CDJR of Frontenac
- Jay Hatfield Honda Powerhouse
- Jay Hatfield Motorsports (5 locations: Wichita, Frontenac, Joplin, Portal, Ottawa)

**Other Brand Partners:**
- Sarcoxie Ford
- Acura of Columbus
- Genesis of Wichita
- Hatchett Hyundai East & West
- Premier Mitsubishi
- Premier Auto Center - Tucson
- World Kia
- AEO Powersports
- Columbus Auto Group
- Winnebago of Rockford

### 3. Users & Access
- **1 Agency Admin**: Can access all 22 dealerships
- **22 Dealership Managers**: Each assigned to one dealership
- **GA4 Property IDs**: Stored for each dealership that has access

## Manual SQL Setup (Alternative)

If you prefer to run SQL manually:

1. **Get your Agency ID**:
   ```sql
   SELECT id, name FROM "Agency" LIMIT 5;
   ```

2. **Edit the SQL files**:
   - Replace `YOUR_AGENCY_ID_HERE` in both SQL files with your actual agency ID

3. **Run the scripts**:
   ```bash
   psql your_database_url -f scripts/create-jay-hatfield-dealerships.sql
   psql your_database_url -f scripts/create-jay-hatfield-users.sql
   ```

## After Setup

### Test the Dealership Selector

1. **Login as Agency Admin**: `admin@autogroup.com`
2. **Go to Dashboard**: You should see a dropdown with all 22 dealerships
3. **Switch Between Dealerships**: Each selection should show that dealership's data

The dropdown will show individual dealership names like:
- "Jay Hatfield Chevrolet of Columbus"
- "Sarcoxie Ford"
- "Hatchett Hyundai East"
- "Acura of Columbus"
- etc.

Instead of just showing "AGENCY"

### SEOWorks Integration

The script will output a mapping table like this:

```
Dealership Name | User ID | Email | GA4 Property ID
Jay Hatfield Chevrolet of Columbus | clm1abc123 | columbus@jayhatfield.com | 323480238
Sarcoxie Ford | clm2def456 | manager@sarcoxieford.com | 452793966
Hatchett Hyundai East | clm3ghi789 | east@hatchetthyundai.com | 323448557
...
```

**Send this mapping to SEOWorks** so they can include the correct `clientId` (User ID) or `clientEmail` in their webhook calls.

## Troubleshooting

### Database Connection Issues
```bash
# Test your connection
npx prisma db execute --schema=prisma/schema.prisma --stdin <<< "SELECT 1;"
```

### Check What Was Created
```sql
-- Check agencies
SELECT id, name FROM "Agency";

-- Check dealerships  
SELECT id, name, website FROM "Dealership" ORDER BY name;

-- Check users
SELECT u.email, u.name, d.name as dealership 
FROM "User" u 
LEFT JOIN "Dealership" d ON u."dealershipId" = d.id 
ORDER BY d.name;
```

### Reset and Start Over
```bash
# This will delete everything and start fresh (BE CAREFUL!)
npx prisma migrate reset --force
node scripts/setup-all-dealerships.js
```

## Next Steps

1. ✅ **Test Dashboard**: Login and verify the dropdown works
2. ✅ **Test Switching**: Make sure each dealership shows correct data  
3. ✅ **Share User IDs**: Send the mapping table to SEOWorks
4. ✅ **Test Webhooks**: Have SEOWorks send test webhooks with User IDs

## Support

If you encounter any issues:
1. Check your database connection
2. Verify your `.env` file has the correct `DATABASE_URL`
3. Make sure your database server is running
4. Check the console output for specific error messages

## Brand Coverage

This setup covers all your automotive brands:
- **Chevrolet/GMC** (Jay Hatfield locations)
- **Chrysler/Dodge/Jeep/Ram** (Jay Hatfield CDJR)
- **Ford** (Sarcoxie Ford)
- **Honda** (Jay Hatfield Honda)
- **Acura** (Acura of Columbus)
- **Hyundai** (Hatchett locations)
- **Genesis** (Genesis of Wichita)
- **Mitsubishi** (Premier Mitsubishi)
- **Kia** (World Kia)
- **Motorsports/Powersports** (Multiple locations)
- **RV** (Winnebago of Rockford)