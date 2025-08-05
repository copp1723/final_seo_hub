// Production Health Check - Comprehensive dealership filtering diagnosis
// Run this in Node.js on your production server or via API endpoint

const https = require('https');
const { URL } = require('url');

const PRODUCTION_URL = 'https://rylie-seo-hub.onrender.com';

// Hardcoded mappings from your codebase for comparison
const EXPECTED_MAPPINGS = {
  'dealer-jhc-columbus': { name: 'Jay Hatfield Chevrolet of Columbus', ga4PropertyId: '323480238' },
  'dealer-jhc-chanute': { name: 'Jay hatfield Chevrolet GMC of Chanute', ga4PropertyId: '323404832' },
  'dealer-jhc-pittsburg': { name: 'Jay Hatfield Chevrolet GMC of Pittsburg', ga4PropertyId: '371672738' },
  'dealer-jhc-vinita': { name: 'Jay Hatfield Chevrolet of Vinita', ga4PropertyId: '320759942' },
  'dealer-jhdjr-frontenac': { name: 'Jay Hatfield CDJR of Frontenac', ga4PropertyId: '323415736' },
  'dealer-sarcoxie-ford': { name: 'Sarcoxie Ford', ga4PropertyId: '452793966' },
  'dealer-jhhp-wichita': { name: 'Jay Hatfield Honda Powerhouse', ga4PropertyId: '336729443' },
  'dealer-jhm-wichita': { name: 'Jay Hatfield Motorsports of Wichita', ga4PropertyId: '317592148' },
  'dealer-jhm-frontenac': { name: 'Jay Hatfield Motorsports of Frontenac', ga4PropertyId: '317608467' },
  'dealer-jhm-joplin': { name: 'Jay Hatfield Motorsports of Joplin', ga4PropertyId: '317578343' },
  'dealer-acura-columbus': { name: 'Acura of Columbus', ga4PropertyId: '284944578' },
  'dealer-genesis-wichita': { name: 'Genesis of Wichita', ga4PropertyId: '323502411' },
  'dealer-jhm-portal': { name: 'Jay Hatfield Motorsports Portal', ga4PropertyId: '461644624' },
  'dealer-jhm-ottawa': { name: 'Jay Hatfield Motorsports Ottawa', ga4PropertyId: '472110523' },
  'dealer-hatchett-hyundai-east': { name: 'Hatchett Hyundai East', ga4PropertyId: '323448557' },
  'dealer-hatchett-hyundai-west': { name: 'Hatchett Hyundai West', ga4PropertyId: '323465145' },
  'dealer-premier-mitsubishi': { name: 'Premier Mitsubishi', ga4PropertyId: '473660351' },
  'dealer-premier-auto-tucson': { name: 'Premier Auto Center - Tucson', ga4PropertyId: '470694371' }
};

async function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, PRODUCTION_URL);
    const requestOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Production-Health-Check/1.0',
        ...options.headers
      }
    };

    const req = https.request(url, requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function runHealthCheck() {
  console.log('🏥 PRODUCTION HEALTH CHECK STARTING...');
  console.log('=====================================');
  
  const results = {
    timestamp: new Date().toISOString(),
    checks: {},
    summary: { passed: 0, failed: 0, warnings: 0 }
  };

  // Check 1: Basic API Health
  console.log('1️⃣ Testing basic API health...');
  try {
    const healthResponse = await makeRequest('/api/health');
    if (healthResponse.status === 200) {
      results.checks.apiHealth = { status: 'PASS', message: 'API is responding' };
      results.summary.passed++;
    } else {
      results.checks.apiHealth = { status: 'FAIL', message: `API returned ${healthResponse.status}` };
      results.summary.failed++;
    }
  } catch (error) {
    results.checks.apiHealth = { status: 'FAIL', message: `API unreachable: ${error.message}` };
    results.summary.failed++;
  }

  // Check 2: Database Connectivity
  console.log('2️⃣ Testing database connectivity...');
  try {
    // Try to access a protected endpoint that requires DB
    const dbResponse = await makeRequest('/api/dealerships/switch');
    if (dbResponse.status === 401) {
      results.checks.database = { status: 'PASS', message: 'Database accessible (auth required)' };
      results.summary.passed++;
    } else if (dbResponse.status === 200) {
      results.checks.database = { status: 'PASS', message: 'Database accessible' };
      results.summary.passed++;
    } else {
      results.checks.database = { status: 'FAIL', message: `Unexpected DB response: ${dbResponse.status}` };
      results.summary.failed++;
    }
  } catch (error) {
    results.checks.database = { status: 'FAIL', message: `Database error: ${error.message}` };
    results.summary.failed++;
  }

  // Check 3: Environment Variables
  console.log('3️⃣ Checking critical environment variables...');
  const criticalEnvVars = [
    'DATABASE_URL',
    'GOOGLE_CLIENT_ID', 
    'GOOGLE_CLIENT_SECRET',
    'GA4_SERVICE_ACCOUNT_EMAIL',
    'NEXTAUTH_SECRET'
  ];
  
  const envStatus = criticalEnvVars.map(envVar => {
    const value = process.env[envVar];
    return {
      name: envVar,
      present: !!value,
      length: value ? value.length : 0
    };
  });

  const missingEnvVars = envStatus.filter(env => !env.present);
  if (missingEnvVars.length === 0) {
    results.checks.environment = { status: 'PASS', message: 'All critical env vars present' };
    results.summary.passed++;
  } else {
    results.checks.environment = { 
      status: 'FAIL', 
      message: `Missing env vars: ${missingEnvVars.map(e => e.name).join(', ')}` 
    };
    results.summary.failed++;
  }

  // Check 4: GA4 Service Account
  console.log('4️⃣ Checking GA4 service account...');
  const ga4ServiceAccount = process.env.GA4_SERVICE_ACCOUNT_EMAIL;
  if (ga4ServiceAccount && ga4ServiceAccount.includes('@') && ga4ServiceAccount.includes('.iam.gserviceaccount.com')) {
    results.checks.ga4ServiceAccount = { status: 'PASS', message: `Service account: ${ga4ServiceAccount}` };
    results.summary.passed++;
  } else {
    results.checks.ga4ServiceAccount = { status: 'FAIL', message: 'Invalid or missing GA4 service account' };
    results.summary.failed++;
  }

  // Check 5: Dealership Mapping Validation
  console.log('5️⃣ Validating dealership mappings...');
  const mappingIssues = [];
  const duplicateProperties = {};
  
  Object.entries(EXPECTED_MAPPINGS).forEach(([dealershipId, config]) => {
    if (!config.ga4PropertyId) {
      mappingIssues.push(`${dealershipId}: No GA4 property ID`);
    } else {
      if (duplicateProperties[config.ga4PropertyId]) {
        mappingIssues.push(`${dealershipId}: Duplicate property ID ${config.ga4PropertyId} (also used by ${duplicateProperties[config.ga4PropertyId]})`);
      } else {
        duplicateProperties[config.ga4PropertyId] = dealershipId;
      }
    }
  });

  if (mappingIssues.length === 0) {
    results.checks.mappingValidation = { status: 'PASS', message: 'All mappings valid' };
    results.summary.passed++;
  } else {
    results.checks.mappingValidation = { 
      status: 'WARN', 
      message: `Mapping issues: ${mappingIssues.join('; ')}` 
    };
    results.summary.warnings++;
  }

  // Summary
  console.log('\n📊 HEALTH CHECK SUMMARY');
  console.log('======================');
  console.log(`✅ Passed: ${results.summary.passed}`);
  console.log(`❌ Failed: ${results.summary.failed}`);
  console.log(`⚠️ Warnings: ${results.summary.warnings}`);
  
  console.log('\n📋 DETAILED RESULTS:');
  Object.entries(results.checks).forEach(([check, result]) => {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} ${check}: ${result.message}`);
  });

  // Recommendations
  console.log('\n🎯 RECOMMENDATIONS:');
  if (results.summary.failed > 0) {
    console.log('❌ CRITICAL: Fix failed checks immediately');
  }
  if (results.summary.warnings > 0) {
    console.log('⚠️ WARNING: Address warnings to prevent future issues');
  }
  if (results.summary.failed === 0 && results.summary.warnings === 0) {
    console.log('✅ All checks passed! System appears healthy.');
    console.log('💡 If dealership filtering still not working, the issue is likely:');
    console.log('   • Database dealership IDs don\'t match hardcoded mappings');
    console.log('   • Cache serving stale data');
    console.log('   • Frontend state management issues');
  }

  return results;
}

// Export for use as module or run directly
if (require.main === module) {
  runHealthCheck()
    .then(results => {
      console.log('\n🎉 Health check completed!');
      process.exit(results.summary.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('💥 Health check failed:', error);
      process.exit(1);
    });
}

module.exports = { runHealthCheck, EXPECTED_MAPPINGS };
