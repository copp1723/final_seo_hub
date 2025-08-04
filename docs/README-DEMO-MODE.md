# 🎭 Demo Mode Guide

## Quick Start for Presentations

For your presentation today, here's the fastest way to enable clean demo data:

### 1. Enable Demo Mode
```bash
./scripts/enable-demo-mode.sh
```

### 2. Start the Application
```bash
npm run dev
```

### 3. Present!
Your dashboard will now show:
- ✨ **Clean, impressive metrics** (24,680 sessions, 18,950 users)
- 📊 **Professional analytics data** (8,940 clicks, 156,780 impressions)
- 🎯 **Realistic progress tracking** (Gold package with 75% completion)
- 📈 **Professional activity timeline** (Recent completions and projects)
- 🟢 **All connections appear as "Connected"** (GA4 & Search Console)

## What Demo Mode Shows

### Dashboard Metrics
- **Active Requests:** 12 (showing healthy workload)
- **Total Requests:** 147 (demonstrating platform usage)
- **GA4 Sessions:** 24,680 (impressive traffic)
- **Search Console Clicks:** 8,940 (strong SEO performance)
- **Package Progress:** Gold package at 75% completion

### Professional Features
- Demo banner at top (clearly indicates demo mode)
- Realistic dealership name: "Premier Auto Dealership"
- All integrations show as properly connected
- Recent activity shows professional workflow
- Clean, error-free interface

### Recent Activity Examples
- Landing page optimizations completed
- Blog posts published with SEO optimization
- Google Business Profile updates
- Technical SEO improvements
- New content requests initiated

## After Your Presentation

### Disable Demo Mode
```bash
./scripts/disable-demo-mode.sh
```

Then restart your application to return to real data.

## Manual Setup

If you prefer to set environment variables manually:

### Enable Demo Mode
Add to your `.env.local` file:
```env
DEMO_MODE=true
NEXT_PUBLIC_DEMO_MODE=true
```

### Disable Demo Mode
Remove or set to false:
```env
DEMO_MODE=false
NEXT_PUBLIC_DEMO_MODE=false
```

## Technical Details

Demo mode works by:
1. **Feature Flag**: Checks `features.demoMode` in `app/lib/features.ts`
2. **API Override**: Dashboard APIs return mock data when demo mode enabled
3. **UI Indicator**: Shows demo banner to prevent confusion
4. **No Database Changes**: Real data remains untouched

### Affected Endpoints
- `/api/dashboard/stats` - Returns demo statistics
- `/api/dashboard/analytics-v2` - Returns demo analytics data
- `/api/dashboard/recent-activity` - Returns demo activity timeline

### Demo Data Location
All mock data is defined in `lib/demo-data.ts` for easy customization.

## Troubleshooting

### Demo Mode Not Working?
1. Check environment variables are set correctly
2. Restart your development server
3. Check browser console for demo mode log messages
4. Verify feature flag is enabled in features.ts

### Need Different Demo Data?
Edit `lib/demo-data.ts` to customize:
- Metrics values
- Package types
- Activity timeline
- Dealership information

### Demo Banner Not Showing?
- Ensure `NEXT_PUBLIC_DEMO_MODE=true` is set
- Check that the dashboard component imported `features`
- Verify the banner component is properly rendered

## Best Practices for Presentations

1. **Test First**: Always test demo mode before your presentation
2. **Clear Indicator**: The demo banner ensures transparency
3. **Professional Data**: Mock data shows realistic, impressive metrics
4. **Clean Interface**: No errors or missing data states
5. **Easy Toggle**: Quick scripts for enable/disable

---

*This demo mode provides clean, professional data perfect for client presentations while keeping your real data safe and unchanged.* 