// Script to clear production cache - run this in your production environment
// This can help if stale cached data is causing dealership filtering issues

const { createClient } = require('redis');

async function clearProductionCache() {
  console.log('🧹 Clearing Production Cache...');
  
  let redisClient;
  
  try {
    // Connect to Redis (Render usually provides REDIS_URL)
    const redisUrl = process.env.REDIS_URL || process.env.REDISCLOUD_URL;
    
    if (!redisUrl) {
      console.log('ℹ️ No Redis URL found - cache might be in-memory only');
      console.log('Try restarting the Render service to clear in-memory cache');
      return;
    }
    
    redisClient = createClient({ url: redisUrl });
    await redisClient.connect();
    
    console.log('✅ Connected to Redis');
    
    // Get all keys that might be related to analytics/dashboard caching
    const patterns = [
      'analytics:*',
      'dashboard:*',
      'ga4:*',
      'search_console:*',
      'dealership:*'
    ];
    
    let totalDeleted = 0;
    
    for (const pattern of patterns) {
      try {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
          console.log(`🔍 Found ${keys.length} keys matching ${pattern}`);
          await redisClient.del(keys);
          totalDeleted += keys.length;
          console.log(`🗑️ Deleted ${keys.length} keys for pattern ${pattern}`);
        }
      } catch (error) {
        console.error(`❌ Error clearing pattern ${pattern}:`, error.message);
      }
    }
    
    console.log(`✅ Cache clearing complete! Deleted ${totalDeleted} total keys`);
    
  } catch (error) {
    console.error('❌ Cache clearing failed:', error.message);
  } finally {
    if (redisClient) {
      await redisClient.quit();
    }
  }
}

// Alternative: Clear cache via API endpoint
async function clearCacheViaAPI() {
  console.log('🌐 Clearing cache via API endpoints...');
  
  const baseUrl = process.env.NEXTAUTH_URL || 'https://rylie-seo-hub.onrender.com';
  
  // You would need to implement a cache clearing endpoint
  // For now, we can force refresh by calling analytics with clearCache=true
  const endpoints = [
    '/api/dashboard/analytics?clearCache=true&dateRange=30days',
    '/api/dashboard/rankings?clearCache=true',
    '/api/dashboard/stats?clearCache=true'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${process.env.CRON_SECRET}` // Use cron secret for auth
        }
      });
      
      if (response.ok) {
        console.log(`✅ Cleared cache for ${endpoint}`);
      } else {
        console.log(`⚠️ Failed to clear cache for ${endpoint}: ${response.status}`);
      }
    } catch (error) {
      console.error(`❌ Error clearing ${endpoint}:`, error.message);
    }
  }
}

// Run the appropriate clearing method
if (require.main === module) {
  clearProductionCache()
    .then(() => clearCacheViaAPI())
    .then(() => {
      console.log('🎉 All cache clearing operations completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Cache clearing failed:', error);
      process.exit(1);
    });
}

module.exports = { clearProductionCache, clearCacheViaAPI };
