const fetch = require('node-fetch');

async function testWebhook() {
  const webhookUrl = 'http://localhost:3001/api/seoworks/webhook';
  
  const testPayload = {
    task_id: 'test-123',
    task_type: 'page',
    status: 'completed',
    completion_date: new Date().toISOString(),
    post_title: 'Test Page Title',
    post_url: 'https://example.com/test-page',
    completion_notes: 'Test completion for debugging'
  };

  try {
    console.log('=== Testing Webhook Endpoint ===');
    console.log('URL:', webhookUrl);
    console.log('Payload:', JSON.stringify(testPayload, null, 2));
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload)
    });

    console.log('\n=== Response ===');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    
    const responseText = await response.text();
    console.log('Response Body:', responseText);
    
    if (response.headers.get('content-type')?.includes('application/json')) {
      try {
        const jsonResponse = JSON.parse(responseText);
        console.log('Parsed JSON:', JSON.stringify(jsonResponse, null, 2));
      } catch (e) {
        console.log('Could not parse as JSON');
      }
    }

  } catch (error) {
    console.error('Error testing webhook:', error);
  }
}

testWebhook();