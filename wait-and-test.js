console.log('⏱️  Waiting for deployment to complete...');
console.log('Changes pushed to main branch, waiting for Render to deploy...');
console.log('');

setTimeout(async () => {
  console.log('🚀 Testing webhook after deployment...');
  
  try {
    const response = await fetch('https://rylie-seo-hub.onrender.com/api/seoworks/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': '7f3e9b5d2a8c4f6e1b9d3c7a5e8f2b4d6c9a1e3f7b5d9c2a6e4f8b1d3c7a9e5f'
      },
      body: JSON.stringify({
        "eventType": "task.completed",
        "data": {
          "status": "completed",
          "deliverables": [{
            "title": "2025 Polaris Ranger Crew 1000 Premium near Olathe, KS",
            "type": "page",
            "url": "www.jayhatfieldottawa.com/2025-polaris-ranger-crew-1000-premium-near-olathe-ks"
          }],
          "clientId": "dealer-jhm-ottawa",
          "taskType": "page",
          "completionDate": "2025-08-12T06:00:00Z",
          "externalId": "test-after-deployment-456"
        },
        "timestamp": "2025-08-15T19:42:49Z"
      })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ SUCCESS! Webhook now accepts SEOWorks format:');
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log('❌ Still failing:');
      console.log(JSON.stringify(result, null, 2));
      console.log('Deployment may need more time...');
    }
  } catch (error) {
    console.error('Network error:', error.message);
  }
}, 30000); // Wait 30 seconds

console.log('Waiting 30 seconds for deployment...');