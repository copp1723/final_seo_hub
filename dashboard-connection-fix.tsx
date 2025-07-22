// Update just the relevant part of the dashboard page
// This snippet shows how to properly display connection status

// In the header section, replace the connection status display with:
{analyticsData && (
  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
    {analyticsData.metadata.dealershipId ? (
      <>
        <span className={`flex items-center gap-1 ${analyticsData.metadata.hasGA4Connection ? 'text-green-600' : 'text-orange-600'}`}>
          <div className={`w-2 h-2 rounded-full ${analyticsData.metadata.hasGA4Connection ? 'bg-green-500' : 'bg-orange-500'}`} />
          GA4 {analyticsData.metadata.hasGA4Connection ? 'Connected' : 'Not Configured'}
        </span>
        <span className={`flex items-center gap-1 ${analyticsData.metadata.hasSearchConsoleConnection ? 'text-green-600' : 'text-orange-600'}`}>
          <div className={`w-2 h-2 rounded-full ${analyticsData.metadata.hasSearchConsoleConnection ? 'bg-green-500' : 'bg-orange-500'}`} />
          Search Console {analyticsData.metadata.hasSearchConsoleConnection ? 'Connected' : 'Not Configured'}
        </span>
        {analyticsData.metadata.dealershipName && (
          <span className="text-gray-400">
            • {analyticsData.metadata.dealershipName}
          </span>
        )}
      </>
    ) : (
      <span className="text-orange-600">
        Select a dealership to view analytics
      </span>
    )}
  </div>
)}

// For the analytics stat cards, update them to show proper messages:

{/* GA4 Sessions */}
<StatCard
  title="GA4 Sessions"
  value={
    !analyticsData?.metadata.dealershipId ? '-' :
    analyticsData?.ga4Data?.sessions?.toLocaleString() || 
    (analyticsData?.errors.ga4Error ? '-' : '0')
  }
  subtitle={
    !analyticsData?.metadata.dealershipId ? "Select dealership" :
    analyticsData?.metadata.hasGA4Connection ? "Last 30 days" : 
    analyticsData?.errors.ga4Error || "No data"
  }
  icon={BarChart}
  color="green"
  loading={analyticsLoading}
/>

{/* Search Console Clicks */}
<StatCard
  title="SC Clicks"
  value={
    !analyticsData?.metadata.dealershipId ? '-' :
    analyticsData?.searchConsoleData?.clicks?.toLocaleString() || 
    (analyticsData?.errors.searchConsoleError ? '-' : '0')
  }
  subtitle={
    !analyticsData?.metadata.dealershipId ? "Select dealership" :
    analyticsData?.metadata.hasSearchConsoleConnection ? "Last 30 days" : 
    analyticsData?.errors.searchConsoleError || "No data"
  }
  icon={TrendingUp}
  color="orange"
  loading={analyticsLoading}
/>
