# CSV-Parse Module Resolution Fix

## Problem Summary
The deployment fails with: `Cannot find module 'csv-parse/sync'` even though it works locally.

## Root Causes
1. **Module Resolution Strategy**: TypeScript's `"moduleResolution": "bundler"` isn't fully supported in all deployment environments
2. **Subpath Exports**: `csv-parse/sync` uses modern ESM subpath exports that require proper Node.js module resolution
3. **Version Compatibility**: csv-parse v6.x has stricter ESM requirements
4. **Webpack Module Resolution**: Next.js webpack configuration has different module resolution behavior in deployment vs development

## Final Solution (Implemented)

### Custom CSV Parser Implementation
After multiple attempts with different csv-parse configurations, we implemented a custom CSV parser that:
- Has zero external dependencies
- Works reliably across all environments
- Handles all our CSV parsing requirements
- Avoids module resolution issues entirely

The implementation is in `lib/utils/csv-parser.ts` and provides the same API as csv-parse for compatibility.

## Applied Solutions History

### 1. Changed TypeScript Module Resolution ✅
- Modified `tsconfig.json`: `"moduleResolution": "bundler"` → `"moduleResolution": "node"`
- This ensures compatibility with standard Node.js module resolution

### 2. Pinned csv-parse Version ❌
- Changed from `"csv-parse": "^6.0.0"` to `"csv-parse": "5.5.6"`
- Version 5.5.6 has better compatibility but still had deployment issues

### 3. Added Custom Type Declaration ❌
- Created `types/csv-parse.d.ts` to help TypeScript resolve the module
- Removed conflicting `@types/csv-parse` from devDependencies
- This fixed TypeScript but not webpack resolution

### 4. Created CSV Parser Wrapper ✅
- Implemented `lib/utils/csv-parser.ts` with custom parsing logic
- Removed all csv-parse dependencies
- This completely eliminates module resolution issues

## Alternative Solutions (If Custom Parser Needs Enhancement)

### Option 1: Use PapaParse
Replace custom implementation with PapaParse which has excellent cross-platform support:
```bash
npm install papaparse @types/papaparse
```

### Option 2: Direct Import Workaround
If reverting to csv-parse, use direct path imports:
```typescript
const { parse } = require('csv-parse/dist/cjs/sync.cjs');
```

### Option 3: Webpack Alias Configuration
Add to `next.config.ts`:
```typescript
webpack: (config) => {
  config.resolve.alias['csv-parse/sync'] = require.resolve('csv-parse/dist/cjs/sync.cjs');
  return config;
}
```

## Verification Steps
1. Run locally: `npm run type-check` (should pass)
2. Run locally: `npm run build` (should succeed)
3. Check deployment logs for successful build
4. Verify CSV import functionality works in production

## Lessons Learned
1. Module resolution can differ significantly between development and deployment environments
2. Subpath exports in npm packages can cause deployment issues
3. Custom implementations for simple utilities can be more reliable than external dependencies
4. Always test builds in production-like environments before deployment 