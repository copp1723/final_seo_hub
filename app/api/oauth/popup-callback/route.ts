import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const success = searchParams.get('success')
  const error = searchParams.get('error')
  const service = searchParams.get('service')

  // Return a simple HTML page that communicates with the parent window
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>OAuth Result</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          background: #f8fafc;
        }
        .container {
          text-align: center;
          padding: 2rem;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .success { color: #059669; }
        .error { color: #dc2626; }
        .loading {
          display: inline-block;
          width: 20px;
          height: 20px;
          border: 3px solid #f3f3f3;
          border-top: 3px solid #3498db;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    </head>
    <body>
      <div class="container">
        ${success === 'true' ? `
          <div class="success">
            <h2>✓ Connection Successful</h2>
            <p>${service === 'ga4' ? 'Google Analytics 4' : service === 'search_console' ? 'Google Search Console' : service} has been connected successfully.</p>
            <p>This window will close automatically...</p>
          </div>
        ` : error ? `
          <div class="error">
            <h2>✗ Connection Failed</h2>
            <p>${decodeURIComponent(error)}</p>
            <p>This window will close automatically...</p>
          </div>
        ` : `
          <div>
            <div class="loading"></div>
            <p>Processing connection...</p>
          </div>
        `}
      </div>
      
      <script>
        // Communicate result to parent window
        if (window.opener) {
          const result = {
            success: ${success === 'true'},
            error: ${error ? `"${decodeURIComponent(error)}"` : 'null'},
            service: "${service}"
          };
          
          window.opener.postMessage({
            type: 'oauth_result',
            ...result
          }, window.location.origin);
          
          // Close popup after a short delay
          setTimeout(() => {
            window.close();
          }, 2000);
        } else {
          // Fallback: redirect to main app
          setTimeout(() => {
            window.location.href = '/settings?tab=integrations';
          }, 3000);
        }
      </script>
    </body>
    </html>
  `

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  })
}
