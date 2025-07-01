import { NextResponse } from 'next/server'

// TEMPORARY: Simple HTML page to trigger database setup
export async function GET() {
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Database Setup</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            max-width: 600px; 
            margin: 50px auto; 
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .button {
            background: #0070f3;
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            margin: 10px 0;
        }
        .button:hover { background: #0051a2; }
        .success { color: #059669; font-weight: bold; }
        .error { color: #dc2626; font-weight: bold; }
        .result { 
            margin-top: 20px; 
            padding: 15px; 
            border-radius: 5px; 
            background: #f9f9f9;
            border-left: 4px solid #ccc;
        }
        .loading { color: #0070f3; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔧 Emergency Database Setup</h1>
        <p>Click the button below to create the required database tables for authentication.</p>
        
        <button class="button" onclick="setupDatabase()">
            🚀 Setup Database Tables
        </button>
        
        <button class="button" onclick="testDatabase()" style="background: #059669;">
            ✅ Test Database
        </button>
        
        <div id="result"></div>
    </div>

    <script>
        async function setupDatabase() {
            const resultDiv = document.getElementById('result');
            resultDiv.innerHTML = '<div class="loading">🔄 Setting up database tables...</div>';
            
            try {
                const response = await fetch('/api/debug/setup-db', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                const data = await response.json();
                
                if (data.success) {
                    resultDiv.innerHTML = \`
                        <div class="result success">
                            ✅ <strong>Database setup successful!</strong><br>
                            Message: \${data.message}<br>
                            User count: \${data.userCount}<br>
                            Time: \${data.timestamp}
                        </div>
                    \`;
                } else {
                    resultDiv.innerHTML = \`
                        <div class="result error">
                            ❌ <strong>Database setup failed</strong><br>
                            Error: \${data.error}<br>
                            Time: \${data.timestamp}
                        </div>
                    \`;
                }
            } catch (error) {
                resultDiv.innerHTML = \`
                    <div class="result error">
                        ❌ <strong>Request failed</strong><br>
                        Error: \${error.message}
                    </div>
                \`;
            }
        }
        
        async function testDatabase() {
            const resultDiv = document.getElementById('result');
            resultDiv.innerHTML = '<div class="loading">🔍 Testing database connection...</div>';
            
            try {
                const response = await fetch('/api/debug/db-test');
                const data = await response.json();
                
                if (data.success) {
                    resultDiv.innerHTML = \`
                        <div class="result success">
                            ✅ <strong>Database test successful!</strong><br>
                            User count: \${data.userCount}<br>
                            Database URL: \${data.databaseUrl}<br>
                            Time: \${data.timestamp}
                        </div>
                    \`;
                } else {
                    resultDiv.innerHTML = \`
                        <div class="result error">
                            ❌ <strong>Database test failed</strong><br>
                            Error: \${data.error}<br>
                            Time: \${data.timestamp}
                        </div>
                    \`;
                }
            } catch (error) {
                resultDiv.innerHTML = \`
                    <div class="result error">
                        ❌ <strong>Request failed</strong><br>
                        Error: \${error.message}
                    </div>
                \`;
            }
        }
    </script>
</body>
</html>
  `
  
  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' }
  })
} 