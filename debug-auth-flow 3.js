const fetch = require('node-fetch');

async function debugAuthFlow() {
  const baseUrl = 'https://rylie-seo-hub.onrender.com';
  
  console.log('=== AUTH FLOW DEBUGGING ===\n');
  
  // Step 1: Test simple signin endpoint
  console.log('1. Testing simple signin endpoint...');
  try {
    const signinResponse = await fetch(`${baseUrl}/api/auth/simple-signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'josh.copp@onekeel.ai'
      })
    });
    
    const signinData = await signinResponse.json();
    const setCookieHeader = signinResponse.headers.get('set-cookie');
    
    console.log('   Status:', signinResponse.status);
    console.log('   Response:', JSON.stringify(signinData, null, 2));
    console.log('   Set-Cookie header:', setCookieHeader);
    
    if (signinResponse.ok && signinData.success) {
      console.log('   ✅ Emergency signin successful!\n');
      
      // Extract session cookie
      const sessionCookie = setCookieHeader ? setCookieHeader.split(';')[0] : null;
      
      if (sessionCookie) {
        // Step 2: Test session endpoint
        console.log('2. Testing session validation...');
        const sessionResponse = await fetch(`${baseUrl}/api/auth/simple-session`, {
          headers: {
            'Cookie': sessionCookie
          }
        });
        
        const sessionData = await sessionResponse.json();
        console.log('   Status:', sessionResponse.status);
        console.log('   Response:', JSON.stringify(sessionData, null, 2));
        
        if (sessionResponse.ok && sessionData.authenticated) {
          console.log('   ✅ Session is valid!\n');
          
          // Step 3: Test protected route access
          console.log('3. Testing protected route access...');
          const dashboardResponse = await fetch(`${baseUrl}/dashboard`, {
            headers: {
              'Cookie': sessionCookie
            },
            redirect: 'manual'
          });
          
          console.log('   Status:', dashboardResponse.status);
          console.log('   Location header:', dashboardResponse.headers.get('location'));
          
          if (dashboardResponse.status === 200) {
            console.log('   ✅ Dashboard access granted!');
          } else if (dashboardResponse.status === 307 || dashboardResponse.status === 302) {
            console.log('   ❌ Redirected to:', dashboardResponse.headers.get('location'));
          }
        } else {
          console.log('   ❌ Session validation failed');
        }
      } else {
        console.log('   ❌ No session cookie received');
      }
    } else {
      console.log('   ❌ Signin failed');
    }
  } catch (error) {
    console.error('   Error:', error.message);
  }
  
  console.log('\n=== ROUTE CONFIGURATION ===');
  console.log('Login page: https://rylie-seo-hub.onrender.com/auth/simple-signin');
  console.log('Dashboard: https://rylie-seo-hub.onrender.com/dashboard');
  console.log('\nNote: Middleware redirects unauthenticated users from /dashboard to /auth/signin');
  console.log('But the actual login page is at /auth/simple-signin');
}

debugAuthFlow();