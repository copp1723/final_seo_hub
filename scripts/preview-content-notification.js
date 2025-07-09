// Run with: node scripts/preview-content-notification.js
const fs = require('fs');
const path = require('path');

// Mock the dependencies
const mockGetUnsubscribeUrl = () => 'https://seohub.example.com/unsubscribe/user_demo/taskCompleted';
const mockBranding = {
  primaryColor: '#1a73e8',
  secondaryColor: '#0d47a1',
  companyName: 'SEOWorks'
};

// Helper function to escape HTML
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

// Recreate the template function
function contentAddedTemplate(request, user, taskDetails, branding) {
  const config = branding || mockBranding;
  const unsubscribeUrl = mockGetUnsubscribeUrl();
  
  const userName = user.name?.trim() || 'there';
  
  const contentTypeDisplay = {
    page: 'New Page',
    blog: 'Blog Post',
    gbp_post: 'Google Business Profile Post',
    'gbp-post': 'Google Business Profile Post',
    improvement: 'Website Improvement',
    maintenance: 'Website Update'
  }[taskDetails.type.toLowerCase()] || 'Content';

  const contentTypeIcon = {
    page: '📄',
    blog: '📝',
    gbp_post: '🏢',
    'gbp-post': '🏢',
    improvement: '⚡',
    maintenance: '🔧'
  }[taskDetails.type.toLowerCase()] || '✨';

  const actionVerb = ['improvement', 'maintenance'].includes(taskDetails.type.toLowerCase()) 
    ? 'updated on' 
    : 'added to';
  
  const content = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Content Added to Your Website</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      padding: 0;
    }
    .header {
      background-color: ${config.primaryColor};
      color: white;
      padding: 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 32px 24px;
    }
    .content-preview {
      background-color: #f8f9fa;
      border-left: 4px solid ${config.primaryColor};
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .content-title {
      font-size: 20px;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 8px;
    }
    .content-type {
      display: inline-block;
      background-color: ${config.primaryColor};
      color: white;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 16px;
    }
    .view-button {
      display: inline-block;
      padding: 14px 28px;
      background-color: ${config.primaryColor};
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
      margin: 20px 0;
    }
    .view-button:hover {
      background-color: ${config.secondaryColor};
    }
    .footer {
      background-color: #f8f9fa;
      padding: 24px;
      text-align: center;
      color: #6c757d;
      font-size: 14px;
    }
    .footer a {
      color: #6c757d;
      text-decoration: underline;
    }
    .highlight-box {
      background-color: #e8f4f8;
      border: 1px solid #b8e0eb;
      padding: 16px;
      border-radius: 6px;
      margin: 20px 0;
    }
    .highlight-box h3 {
      margin-top: 0;
      color: #0066cc;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New Content ${actionVerb} Your Website!</h1>
    </div>
    <div class="content">
      <p>Hi ${userName},</p>
      
      <p><strong>Great news!</strong> Fresh content has been ${actionVerb} your website by our SEO team. This helps improve your search visibility and keeps your site engaging for visitors.</p>
      
      <div class="content-preview">
        <div class="content-type">${contentTypeIcon} ${contentTypeDisplay}</div>
        <div class="content-title">${escapeHtml(taskDetails.title)}</div>
        ${taskDetails.url ? `
          <p style="margin: 16px 0 0 0;">
            <a href="${taskDetails.url}" class="view-button">View Your New Content →</a>
          </p>
        ` : ''}
      </div>
      
      <div class="highlight-box">
        <h3>📈 Why This Matters</h3>
        <ul style="margin: 8px 0; padding-left: 20px;">
          <li>Fresh content signals to Google that your site is active and relevant</li>
          <li>New ${contentTypeDisplay.toLowerCase()}s target specific keywords to attract more customers</li>
          <li>Regular updates improve your local search rankings</li>
        </ul>
      </div>
      
      ${request.packageType ? `
        <h3>Your SEO Progress This Month</h3>
        <ul>
          ${request.pagesCompleted > 0 ? `<li>Pages Added: <strong>${request.pagesCompleted}</strong></li>` : ''}
          ${request.blogsCompleted > 0 ? `<li>Blog Posts Published: <strong>${request.blogsCompleted}</strong></li>` : ''}
          ${request.gbpPostsCompleted > 0 ? `<li>Google Business Posts: <strong>${request.gbpPostsCompleted}</strong></li>` : ''}
          ${request.improvementsCompleted > 0 ? `<li>Site Improvements: <strong>${request.improvementsCompleted}</strong></li>` : ''}
        </ul>
      ` : ''}
      
      <p style="margin-top: 24px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://seohub.example.com'}/dashboard" style="color: ${config.primaryColor}; text-decoration: underline;">
          View all your SEO progress in the dashboard →
        </a>
      </p>
      
      <p style="margin-top: 32px; color: #6c757d; font-size: 14px;">
        <em>Your SEO team is continuously working to improve your online presence. We'll notify you each time new content is added.</em>
      </p>
    </div>
    <div class="footer">
      <p>This email was sent by ${config.companyName} - Your SEO Partner</p>
      ${unsubscribeUrl ? `<p><a href="${unsubscribeUrl}">Manage notification preferences</a></p>` : ''}
      <p>&copy; ${new Date().getFullYear()} ${config.companyName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;

  return {
    subject: `✨ ${contentTypeDisplay} Added: "${taskDetails.title}"`,
    html: content
  };
}

// Sample data
const sampleUser = {
  id: 'user_demo',
  email: 'john@exampledealership.com',
  name: 'John Smith',
  role: 'USER'
};

const sampleRequest = {
  id: 'req_demo',
  userId: 'user_demo',
  packageType: 'GOLD',
  pagesCompleted: 2,
  blogsCompleted: 4,
  gbpPostsCompleted: 8,
  improvementsCompleted: 1
};

// Test scenarios
const scenarios = [
  {
    name: 'page-notification',
    taskDetails: {
      title: '2024 Toyota Camry Deals in Chicago - Best Prices',
      type: 'page',
      url: 'https://exampledealership.com/2024-toyota-camry-chicago'
    }
  },
  {
    name: 'blog-notification',
    taskDetails: {
      title: 'Winter Car Maintenance Tips: Keep Your Vehicle Running Smoothly',
      type: 'blog',
      url: 'https://exampledealership.com/blog/winter-car-maintenance-tips'
    }
  },
  {
    name: 'gbp-notification',
    taskDetails: {
      title: '🎄 Holiday Special: 0% APR Financing on All 2024 Models!',
      type: 'gbp-post',
      url: 'https://posts.gle/abc123xyz'
    }
  },
  {
    name: 'improvement-notification',
    taskDetails: {
      title: 'Homepage Speed Optimization & Mobile Experience Enhancement',
      type: 'improvement',
      url: 'https://exampledealership.com'
    }
  },
  {
    name: 'no-url-notification',
    taskDetails: {
      title: 'Backend SEO Schema Markup Implementation',
      type: 'improvement',
      url: undefined
    }
  }
];

// Create previews directory
const previewsDir = path.join(__dirname, '..', 'email-previews');
if (!fs.existsSync(previewsDir)) {
  fs.mkdirSync(previewsDir, { recursive: true });
}

// Generate HTML files
scenarios.forEach(scenario => {
  const result = contentAddedTemplate(sampleRequest, sampleUser, scenario.taskDetails);
  const outputPath = path.join(previewsDir, `${scenario.name}.html`);
  
  const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Email Preview: ${scenario.name}</title>
  <style>
    body { 
      margin: 0; 
      padding: 20px; 
      background: #f5f5f5; 
      font-family: Arial, sans-serif;
    }
    .subject-line {
      background: #333;
      color: white;
      padding: 15px;
      margin-bottom: 20px;
      font-size: 16px;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="subject-line">Subject: ${result.subject}</div>
  ${result.html}
</body>
</html>
  `;
  
  fs.writeFileSync(outputPath, fullHtml);
  console.log(`✓ Generated preview: ${scenario.name}.html`);
});

console.log('\nAll email previews generated in ./email-previews/');
console.log('You can open these HTML files in a browser to see how the emails will look.');