import { Request, User } from '@prisma/client'
import { format } from 'date-fns'
import { getUnsubscribeUrl } from './client'
import { BrandingConfig, getBrandingFromDomain, DEFAULT_BRANDING } from '@/lib/branding/config'

// Helper function to escape HTML characters
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}

// Content-specific email template for showing completed work
export function contentAddedTemplate(
  request: Request,
  user: User,
  taskDetails: { title: string; type: string; url?: string },
  branding?: BrandingConfig
): { subject: string; html: string } {
  const config = branding || DEFAULT_BRANDING
  const unsubscribeUrl = getUnsubscribeUrl(user.id, 'taskCompleted')
  
  // Handle user name - trim whitespace and fallback to 'there' if empty
  const userName = user.name?.trim() || 'there'
  
  // Friendly content type names with icons
  const contentTypeDisplay = {
    page: 'New Page',
    blog: 'Blog Post',
    gbp_post: 'Google Business Profile Post',
    'gbp-post': 'Google Business Profile Post',
    improvement: 'Website Improvement',
    maintenance: 'Website Update'
  }[taskDetails.type.toLowerCase()] || 'Content'

  const contentTypeIcon = {
    page: '📄',
    blog: '📝',
    gbp_post: '🏢',
    'gbp-post': '🏢',
    improvement: '⚡',
    maintenance: '🔧'
  }[taskDetails.type.toLowerCase()] || '✨'

  const actionVerb = ['improvement', 'maintenance'].includes(taskDetails.type.toLowerCase()) 
    ? 'updated on' 
    : 'added to'
  
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
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="color: ${config.primaryColor}; text-decoration: underline;">
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
  `

  return {
    subject: `✨ ${contentTypeDisplay} Added: "${taskDetails.title}"`,
    html: content
  }
}