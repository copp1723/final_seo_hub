# GA4 360 Migration Guide

## Overview
This guide outlines the migration path from our custom multi-property GA4 analytics solution to Google Analytics 360's native subproperties and roll-up properties.

## Data Model Compatibility

### Current Custom Approach
```prisma
// Dealership uses individual GA4 properties
ga4PropertyId: "properties/123456789"
```

### Future GA4 360 Approach
```prisma
// Dealership becomes a subproperty
ga4SubpropertyId: "properties/987654321"
ga4SourcePropertyId: "properties/111111111" // Roll-up property
```

## Migration Steps

### Phase 1: Pre-Migration (Current State)
1. Each dealership has its own GA4 property (`ga4PropertyId`)
2. Custom aggregation logic combines data from multiple properties
3. Filter criteria stored in `filterCriteria` field for future use

### Phase 2: GA4 360 Setup
1. Create roll-up property for each agency
2. Convert existing properties to subproperties
3. Apply stored filter criteria to subproperty configuration

### Phase 3: Data Migration
```typescript
// Example migration logic
async function migrateToGA4360(dealership: Dealership) {
  // 1. Create subproperty in GA4 360
  const subproperty = await createSubproperty({
    sourceProperty: dealership.ga4SourcePropertyId,
    displayName: dealership.name,
    filter: dealership.filterCriteria
  });
  
  // 2. Update dealership record
  await updateDealership(dealership.id, {
    ga4SubpropertyId: subproperty.name,
    ga4SourcePropertyId: rollupPropertyId
  });
  
  // 3. Migrate historical data if needed
  await migrateHistoricalData(dealership.ga4PropertyId, subproperty.name);
}
```

## API Compatibility

### Current Custom API Pattern
```typescript
// Fetch data from multiple properties
const dealershipData = await Promise.all(
  dealerships.map(d => fetchGA4Data(d.ga4PropertyId))
);
```

### GA4 360 API Pattern
```typescript
// Fetch aggregated data from roll-up property
const aggregatedData = await fetchGA4Data(agency.rollupPropertyId);

// Or fetch individual subproperty data
const dealershipData = await fetchGA4Data(dealership.ga4SubpropertyId);
```

## Filter Criteria Mapping

### Custom Solution Filter Format
```json
{
  "hostname": "dealership-name.com",
  "pagePath": "/inventory/*",
  "customDimensions": {
    "dealershipId": "dealer123",
    "region": "southwest"
  }
}
```

### GA4 360 Subproperty Filter Format
```json
{
  "dimensionFilter": {
    "andGroup": {
      "expressions": [
        {
          "filter": {
            "fieldName": "hostname",
            "stringFilter": {
              "value": "dealership-name.com"
            }
          }
        }
      ]
    }
  }
}
```

## Benefits of Migration

1. **Native Roll-up Reporting**: Automatic aggregation across all dealerships
2. **Unified Data Processing**: Single data stream for all properties
3. **Advanced Attribution**: Cross-property user journey tracking
4. **Enterprise Features**: Access to GA4 360 exclusive features
5. **Simplified Management**: Centralized property administration

## Migration Checklist

- [ ] Audit current GA4 property configurations
- [ ] Document custom aggregation logic
- [ ] Map filter criteria to GA4 360 format
- [ ] Create roll-up property structure
- [ ] Test subproperty creation process
- [ ] Validate data continuity
- [ ] Update application code to use new property IDs
- [ ] Train team on GA4 360 features
- [ ] Monitor post-migration analytics

## Rollback Strategy

The dual-field approach in our data model allows for safe rollback:
1. Both `ga4PropertyId` and `ga4SubpropertyId` can coexist
2. Application can switch between approaches via feature flag
3. Historical data remains accessible in original properties