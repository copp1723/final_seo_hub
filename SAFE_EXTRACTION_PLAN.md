# Safe Extraction Plan - Step by Step

## What I've Added (Zero Risk)

### 1. Enhanced Prompts (`/app/lib/ai/enhanced-prompts.ts`)
- Standalone file, doesn't affect existing code
- Only used if you enable feature flag
- Can test with: `NEXT_PUBLIC_FEATURE_ENHANCED_PROMPTS=true`

### 2. Performance Cache (`/app/lib/cache/performance-cache.ts`)
- Completely independent module
- Only activates with feature flag
- Can test with: `NEXT_PUBLIC_FEATURE_SEMANTIC_CACHE=true`

### 3. Feature Flags (`/app/lib/features.ts`)
- All features default to FALSE
- Nothing changes unless you explicitly enable

### 4. Enhanced Chat Route (`/app/api/chat/enhanced/route.ts`)
- Parallel implementation at `/api/chat/enhanced`
- Your existing `/api/chat` is untouched
- Uses your existing OpenRouter setup

## How to Test Safely

### Step 1: Test Enhanced Chat (No Database Changes)
```bash
# In your .env.local, add:
NEXT_PUBLIC_FEATURE_SEMANTIC_CACHE=true

# Test the enhanced endpoint
curl -X POST http://localhost:3000/api/chat/enhanced \
  -H "Content-Type: application/json" \
  -d '{"message": "What is included in the Gold package?"}'
```

### Step 2: Test with Enhanced Prompts
```bash
# Add to .env.local:
NEXT_PUBLIC_FEATURE_ENHANCED_PROMPTS=true

# The enhanced chat will now use better prompts
# Your existing chat at /api/chat remains unchanged
```

### Step 3: Add JSONB Fields (Optional, Safe)
```bash
# Run the migration (it uses IF NOT EXISTS, so it's safe)
npx prisma db execute --file ./prisma/migrations/add_jsonb_metadata_safe.sql

# Then generate Prisma client
npx prisma generate
```

## What You Can Extract Next (When Ready)

### From Seorylie's Channel Handlers
1. Start with just email abstraction
2. Keep using your existing Mailgun
3. Add provider switching later

### From Seorylie's Database
1. GA4 caching tables (new tables, won't affect existing)
2. Multi-tenant GA4 architecture
3. Service account rotation

### From Seorylie's Performance
1. The 3-layer cache is already added (just enable it)
2. API response caching
3. Semantic similarity matching

## Testing Checklist

- [ ] Your existing `/api/chat` still works exactly the same
- [ ] Enhanced chat at `/api/chat/enhanced` responds
- [ ] Cache stats appear in logs when enabled
- [ ] No errors in existing functionality
- [ ] Database migrations don't break anything

## Rollback Plan

If anything goes wrong:

1. **Remove feature flags from .env**
   - Everything reverts to original behavior

2. **Delete new files** (if needed)
   ```bash
   rm app/lib/ai/enhanced-prompts.ts
   rm app/lib/cache/performance-cache.ts
   rm app/lib/features.ts
   rm app/api/chat/enhanced/route.ts
   ```

3. **Rollback database** (if you ran migration)
   ```sql
   -- Only if you need to remove the new columns
   ALTER TABLE "Agency" DROP COLUMN IF EXISTS "metadata";
   ALTER TABLE "User" DROP COLUMN IF EXISTS "ai_preferences";
   ALTER TABLE "Request" DROP COLUMN IF EXISTS "extended_data";
   DROP TABLE IF EXISTS "GA4ReportCache";
   DROP TABLE IF EXISTS "CommunicationChannel";
   ```

## Your Existing Code is 100% Safe

- No changes to `/app/api/chat/route.ts`
- No changes to `/lib/openrouter.ts`
- No changes to your authentication
- No changes to your existing database schema
- Everything new is behind feature flags

## Next Safe Steps

1. Test the enhanced chat endpoint
2. Enable cache and check performance
3. Try enhanced prompts and compare quality
4. Only then consider database changes

Remember: **Nothing activates unless you explicitly enable it**