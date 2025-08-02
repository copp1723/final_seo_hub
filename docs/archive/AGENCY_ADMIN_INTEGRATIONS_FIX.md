# Agency Admin Integration Access Fix

## The Problem

Agency admins couldn't connect GA4 or Search Console integrations because:

1. **UI Issue**: The settings page wasn't showing the Connect buttons for agency admins
2. **API Issue**: The integrations API was returning an error for agency admins without a dealership
3. **OAuth Issue**: The GA4 and Search Console OAuth callbacks require a dealership assignment

## The Solution

### 1. UI Fix (✅ Completed)
Updated the settings page to show integration options for both SUPER_ADMIN and AGENCY_ADMIN roles.

### 2. API Fix (✅ Completed)
Updated `/api/settings/integrations` to return empty integration state for agency admins without dealerships, allowing them to see the UI.

### 3. Dealership Assignment (🔧 Action Required)

The root issue is that integrations are stored at the **dealership level**, not the agency level. Agency admins need to be assigned to a dealership to connect integrations.

## How to Fix for SEOWERKS Agency Admin

### Step 1: Check Current Status

SSH into your Render server and run:

```bash
cd /opt/render/project/src
node scripts/check-seowerks-dealerships.js
```

This will show:
- Whether the agency admin has a dealership assigned
- What dealerships exist for the SEOWERKS agency
- Instructions on how to fix

### Step 2: Create Dealerships (if needed)

If SEOWERKS has no dealerships:

**Option A: Via UI (as Super Admin)**
1. Go to the Admin Dashboard
2. Navigate to the SEOWERKS agency
3. Create dealerships

**Option B: Via Script**
Use the bulk create script with the agency ID shown in the check script output.

### Step 3: Assign Dealership to Agency Admin

Once dealerships exist, run:

```bash
node scripts/assign-dealership.js <userId> <dealershipId>
```

The check script will show you the exact command with the correct IDs.

## After Assignment

Once the agency admin has a dealership assigned:

1. Impersonate the agency admin again
2. Go to Settings > Integrations
3. You'll now be able to connect GA4 and Search Console
4. The connections will be stored for that specific dealership

## Future Improvements

To make this more seamless, we could:

1. **Agency-Level Integrations**: Modify the schema to allow agency-level GA4/Search Console connections
2. **Auto-Assignment**: Automatically assign the first dealership to agency admins
3. **Dealership Selector in OAuth**: Allow selecting a dealership during the OAuth flow

## Technical Details

The integration connections are stored in these tables:
- `GA4Connection` - linked to `dealershipId`
- `SearchConsoleConnection` - linked to `dealershipId`

This is why users need a dealership assignment to connect integrations. 