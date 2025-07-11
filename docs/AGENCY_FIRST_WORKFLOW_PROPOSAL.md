# Agency-First Workflow Proposal

## Current Issues

Since 95% of dealerships come through agencies (not direct), the current system creates friction:

1. **Agency admins need dealership assignment** to connect integrations
2. **No streamlined dealership onboarding** from agency perspective
3. **Integrations are dealership-level**, not agency-level

## Proposed Solutions

### Immediate Fix (For Testing)

Run this on your Render server:
```bash
cd /opt/render/project/src
node scripts/create-seowerks-test-dealership.js
```

This creates a test dealership and assigns it to the SEOWERKS agency admin.

### Short-Term Improvements

#### 1. Auto-Create Initial Dealership
When creating an agency admin, automatically create a "Default Dealership" for testing/setup:

```typescript
// When creating agency admin
const defaultDealership = await prisma.dealership.create({
  data: {
    name: `${agency.name} - Default`,
    agencyId: agency.id,
    isDefault: true // New field
  }
})

await prisma.user.update({
  where: { id: agencyAdmin.id },
  data: { dealershipId: defaultDealership.id }
})
```

#### 2. Agency Dashboard Improvements
Add a prominent "Add New Dealership" workflow:
- Quick dealership creation form
- Bulk import option
- Automatic user creation for dealership managers

### Long-Term Solutions

#### 1. Agency-Level Integrations
Allow agencies to connect GA4/Search Console at the agency level:

```prisma
model AgencyIntegration {
  id        String   @id @default(cuid())
  agencyId  String   @unique
  agency    Agency   @relation(fields: [agencyId], references: [id])
  
  // GA4 fields
  ga4PropertyId    String?
  ga4AccessToken   String?
  
  // Search Console fields
  scAccessToken    String?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

Benefits:
- Connect once, use for all dealerships
- Agency-wide analytics dashboards
- Simplified onboarding

#### 2. Dealership Inheritance
Dealerships can inherit agency integrations:

```typescript
// When fetching GA4 data
const connection = await getGA4Connection(dealershipId)
if (!connection && dealership.useAgencyIntegrations) {
  connection = await getAgencyGA4Connection(dealership.agencyId)
}
```

#### 3. Improved Onboarding Flow

**For Agencies:**
1. Create agency account
2. Connect integrations (agency-level)
3. Add dealerships (inherit integrations)
4. Invite dealership users

**For Dealerships:**
1. Receive invitation from agency
2. Complete profile
3. Integrations already connected!
4. Start using platform

## Implementation Priority

1. **Immediate**: Run the test dealership script
2. **This Week**: Add "Create Dealership" button to agency admin dashboard
3. **Next Sprint**: Implement agency-level integrations
4. **Future**: Full inheritance system

## Benefits

- **Faster onboarding**: Agencies can set up multiple dealerships quickly
- **Less friction**: No need to connect integrations for each dealership
- **Better analytics**: Agency-wide reporting and insights
- **Scalability**: Easy to add new dealerships to existing agencies

## Next Steps

1. Run the test dealership script to unblock SEOWERKS
2. Decide on short-term vs long-term approach
3. Prioritize based on customer needs 