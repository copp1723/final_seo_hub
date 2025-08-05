// Quick Production Test - Run this in your browser console on the production site
// This will help identify if dealership filtering is working

console.log('🔍 Starting Production Dealership Filtering Test...');

async function testDealershipFiltering() {
  try {
    // 1. Get available dealerships
    console.log('1️⃣ Fetching available dealerships...');
    const dealershipsResponse = await fetch('/api/dealerships/switch', {
      credentials: 'include'
    });
    
    if (!dealershipsResponse.ok) {
      console.error('❌ Failed to fetch dealerships:', dealershipsResponse.status);
      return;
    }
    
    const dealershipsData = await dealershipsResponse.json();
    console.log('✅ Dealerships data:', dealershipsData);
    
    if (!dealershipsData.availableDealerships || dealershipsData.availableDealerships.length === 0) {
      console.error('❌ No dealerships found! This is the problem.');
      return;
    }
    
    const firstDealership = dealershipsData.availableDealerships[0];
    const secondDealership = dealershipsData.availableDealerships[1] || firstDealership;
    
    console.log(`🎯 Testing with dealerships:`, {
      first: firstDealership.name,
      second: secondDealership.name
    });
    
    // 2. Test analytics without dealership filter
    console.log('2️⃣ Testing analytics WITHOUT dealership filter...');
    const analyticsDefault = await fetch('/api/dashboard/analytics?dateRange=30days', {
      credentials: 'include'
    });
    
    const defaultData = await analyticsDefault.json();
    console.log('📊 Default analytics:', defaultData.data?.combinedMetrics || 'No data');
    
    // 3. Test analytics WITH first dealership filter
    console.log(`3️⃣ Testing analytics WITH dealership filter (${firstDealership.name})...`);
    const analyticsFiltered = await fetch(`/api/dashboard/analytics?dateRange=30days&dealershipId=${firstDealership.id}`, {
      credentials: 'include'
    });
    
    const filteredData = await analyticsFiltered.json();
    console.log('📊 Filtered analytics:', filteredData.data?.combinedMetrics || 'No data');
    
    // 4. Switch dealership
    console.log(`4️⃣ Switching to dealership: ${firstDealership.name}...`);
    const switchResponse = await fetch('/api/dealerships/switch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ dealershipId: firstDealership.id })
    });
    
    const switchResult = await switchResponse.json();
    console.log('🔄 Switch result:', switchResult);
    
    // 5. Test analytics after switch
    console.log('5️⃣ Testing analytics AFTER dealership switch...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    
    const analyticsAfterSwitch = await fetch('/api/dashboard/analytics?dateRange=30days', {
      credentials: 'include'
    });
    
    const afterSwitchData = await analyticsAfterSwitch.json();
    console.log('📊 Analytics after switch:', afterSwitchData.data?.combinedMetrics || 'No data');
    
    // 6. Compare results
    console.log('🔍 COMPARISON RESULTS:');
    console.log('===================');
    
    const defaultMetrics = defaultData.data?.combinedMetrics;
    const filteredMetrics = filteredData.data?.combinedMetrics;
    const afterSwitchMetrics = afterSwitchData.data?.combinedMetrics;
    
    if (!defaultMetrics && !filteredMetrics && !afterSwitchMetrics) {
      console.error('❌ NO DATA FOUND - This suggests a deeper issue with GA4/Search Console connections');
    } else if (JSON.stringify(defaultMetrics) === JSON.stringify(filteredMetrics) && 
               JSON.stringify(filteredMetrics) === JSON.stringify(afterSwitchMetrics)) {
      console.error('❌ SAME DATA EVERYWHERE - Dealership filtering is NOT working');
      console.log('🔍 This suggests either:');
      console.log('   • Dealership IDs in database don\'t match hardcoded mappings');
      console.log('   • All dealerships are using the same GA4 property');
      console.log('   • Caching is serving stale data');
    } else {
      console.log('✅ DIFFERENT DATA FOUND - Dealership filtering appears to be working');
    }
    
    // 7. Test with second dealership if available
    if (secondDealership.id !== firstDealership.id) {
      console.log(`6️⃣ Testing with second dealership: ${secondDealership.name}...`);
      
      const secondSwitchResponse = await fetch('/api/dealerships/switch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ dealershipId: secondDealership.id })
      });
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const secondAnalytics = await fetch('/api/dashboard/analytics?dateRange=30days', {
        credentials: 'include'
      });
      
      const secondData = await secondAnalytics.json();
      console.log('📊 Second dealership analytics:', secondData.data?.combinedMetrics || 'No data');
      
      if (JSON.stringify(afterSwitchMetrics) === JSON.stringify(secondData.data?.combinedMetrics)) {
        console.warn('⚠️ SAME DATA for different dealerships - This is suspicious');
      } else {
        console.log('✅ Different data for different dealerships - Good!');
      }
    }
    
    console.log('🎉 Test completed! Check the results above.');
    
  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

// Run the test
testDealershipFiltering();
