# CSV-Parse Module Resolution Fix

## Problem Summary
The deployment fails with: `Cannot find module 'csv-parse/sync'` even though it works locally.

## Root Causes
1. **Module Resolution Strategy**: TypeScript's `"moduleResolution": "bundler"` isn't fully supported in all deployment environments
2. **Subpath Exports**: `csv-parse/sync` uses modern ESM subpath exports that require proper Node.js module resolution
3. **Version Compatibility**: csv-parse v6.x has stricter ESM requirements

## Applied Solutions

### 1. Changed TypeScript Module Resolution
- Modified `tsconfig.json`: `"moduleResolution": "bundler"` → `"moduleResolution": "node"`
- This ensures compatibility with standard Node.js module resolution

### 2. Pinned csv-parse Version
- Changed from `"csv-parse": "^6.0.0"` to `"csv-parse": "5.5.6"`
- Version 5.5.6 has better compatibility with various module systems

### 3. Added Custom Type Declaration
- Created `types/csv-parse.d.ts` to help TypeScript resolve the module
- Removed conflicting `@types/csv-parse` from devDependencies

### 4. Updated Cache Bust
- Modified `.render-cache-bust` to force a complete rebuild on Render
- This ensures no cached modules interfere with the fix

## Alternative Solutions (If Issue Persists)

### Option 1: Direct Import Workaround
Replace the import in `lib/services/csv-dealership-processor.ts`:
```typescript
// Instead of: import { parse } from 'csv-parse/sync'
const { parse } = require('csv-parse/lib/sync');
```

### Option 2: Wrapper Module
Create `lib/utils/csv-parser.ts`:
```typescript
import * as csvParse from 'csv-parse';

export function parseSync(input: string | Buffer, options?: any): any[] {
  const parser = csvParse.parse(input, { ...options, columns: true });
  const records: any[] = [];
  parser.on('readable', function() {
    let record;
    while ((record = parser.read()) !== null) {
      records.push(record);
    }
  });
  parser.end();
  return records;
}
```

Then use: `import { parseSync as parse } from '@/lib/utils/csv-parser'`

### Option 3: Environment-Specific Build
Add to `next.config.ts`:
```typescript
webpack: (config, { isServer }) => {
  if (isServer) {
    config.resolve.alias['csv-parse/sync'] = require.resolve('csv-parse/lib/sync');
  }
  return config;
}
```

## Verification Steps
1. Run locally: `npm run type-check` (should pass)
2. Run locally: `npm run build` (should succeed)
3. Check deployment logs for successful module resolution
4. If still failing, check Node.js version on Render matches `.nvmrc` (20.18.0)

## Long-term Recommendation
Consider migrating to a more deployment-friendly CSV parsing solution like `papaparse` if issues persist across multiple deployments. 