import { Request, User } from '@prisma/client'
import { format } from 'date-fns'
import { getUnsubscribeUrl } from './client'

// Base template with header and footer
function baseTemplate(content: string, unsubscribeUrl?: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SEO Hub Notification</title>
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
      background-color: #2563eb;
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
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #2563eb;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
      margin: 16px 0;
    }
    .button:hover {
      background-color: #1d4ed8;
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
    .task-item {
      background-color: #f8f9fa;
      padding: 16px;
      margin: 8px 0;
      border-radius: 6px;
      border-left: 4px solid #2563eb;
    }
    .task-title {
      font-weight: 600;
      margin-bottom: 4px;
    }
    .task-meta {
      color: #6c757d;
      font-size: 14px;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      text-transform: uppercase;
    }
    .status-pending { background-color: #fbbf24; color: #78350f; }
    .status-in-progress { background-color: #60a5fa; color: #1e3a8a; }
    .status-completed { background-color: #34d399; color: #064e3b; }
    .status-cancelled { background-color: #f87171; color: #7f1d1d; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>SEO Hub</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>This email was sent by SEO Hub - Your AI-Powered SEO Request Management Platform</p>
      ${unsubscribeUrl ? `<p><a href="${unsubscribeUrl}">Unsubscribe from these notifications</a></p>` : ''}
      <p>&copy; ${new Date().getFullYear()} SEO Hub. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `
}

// Welcome email template
export function welcomeEmailTemplate(user: User): { subject: string; html: string } {
  const unsubscribeUrl = getUnsubscribeUrl(user.id, 'welcome')
  
  const content = `
    <h2>Welcome to SEO Hub, ${user.name || 'there'}!</h2>
    <p>We're excited to have you on board. SEO Hub is your AI-powered platform for managing SEO requests efficiently.</p>
    
    <h3>Getting Started</h3>
    <p>Here's what you can do with SEO Hub:</p>
    <ul>
      <li><strong>Create Requests:</strong> Submit SEO content requests for pages, blogs, and more</li>
      <li><strong>Track Progress:</strong> Monitor the status of your requests in real-time</li>
      <li><strong>AI Chat Assistant:</strong> Get instant help with SEO questions and strategies</li>
      <li><strong>Analytics Integration:</strong> Connect Google Analytics and Search Console for insights</li>
    </ul>
    
    <p>Ready to get started?</p>
    <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" class="button">Go to Dashboard</a>
    
    <p>If you have any questions, our support team is here to help!</p>
  `

  return {
    subject: 'Welcome to SEO Hub',
    html: baseTemplate(content, unsubscribeUrl)
  }
}

// Request created confirmation template
export function requestCreatedTemplate(request: Request, user: User): { subject: string; html: string } {
  const unsubscribeUrl = getUnsubscribeUrl(user.id, 'requestCreated')
  
  const content = `
    <h2>Request Created Successfully</h2>
    <p>Hi ${user.name || 'there'},</p>
    <p>Your SEO request has been created and is now in our system.</p>
    
    <div class="task-item">
      <div class="task-title">${request.title}</div>
      <div class="task-meta">
        Type: ${request.type.replace('_', ' ').toUpperCase()} | 
        Priority: ${request.priority} | 
        Status: <span class="status-badge status-${request.status.toLowerCase()}">${request.status}</span>
      </div>
    </div>
    
    <p><strong>What happens next?</strong></p>
    <ul>
      <li>Our team will review your request shortly</li>
      <li>You'll receive notifications when the status changes</li>
      <li>Track progress anytime in your dashboard</li>
    </ul>
    
    <a href="${process.env.NEXT_PUBLIC_APP_URL}/requests" class="button">View Request</a>
  `

  return {
    subject: `Request Created: ${request.title}`,
    html: baseTemplate(content, unsubscribeUrl)
  }
}

// Status changed notification template
export function statusChangedTemplate(
  request: Request, 
  user: User, 
  oldStatus: string, 
  newStatus: string
): { subject: string; html: string } {
  const unsubscribeUrl = getUnsubscribeUrl(user.id, 'statusChanged')
  
  const statusMessages = {
    'IN_PROGRESS': 'Your request is now being worked on by our team.',
    'COMPLETED': 'Great news! Your request has been completed.',
    'CANCELLED': 'Your request has been cancelled.'
  }
  
  const content = `
    <h2>Request Status Updated</h2>
    <p>Hi ${user.name || 'there'},</p>
    <p>${statusMessages[newStatus as keyof typeof statusMessages] || 'The status of your request has changed.'}</p>
    
    <div class="task-item">
      <div class="task-title">${request.title}</div>
      <div class="task-meta">
        Status changed from <span class="status-badge status-${oldStatus.toLowerCase()}">${oldStatus}</span> 
        to <span class="status-badge status-${newStatus.toLowerCase()}">${newStatus}</span>
      </div>
    </div>
    
    ${newStatus === 'COMPLETED' && request.completedTasks ? `
      <h3>Completed Tasks:</h3>
      ${(request.completedTasks as any[]).map(task => `
        <div class="task-item">
          <div class="task-title">${task.title}</div>
          <div class="task-meta">
            Type: ${task.type} | 
            ${task.url ? `<a href="${task.url}">View Content</a>` : ''}
          </div>
        </div>
      `).join('')}
    ` : ''}
    
    <a href="${process.env.NEXT_PUBLIC_APP_URL}/requests" class="button">View Request</a>
  `

  return {
    subject: `Request ${newStatus === 'COMPLETED' ? 'Completed' : 'Updated'}: ${request.title}`,
    html: baseTemplate(content, unsubscribeUrl)
  }
}

// Task completed notification template
export function taskCompletedTemplate(
  request: Request,
  user: User,
  taskDetails: { title: string; type: string; url?: string }
): { subject: string; html: string } {
  const unsubscribeUrl = getUnsubscribeUrl(user.id, 'taskCompleted')
  
  const content = `
    <h2>Task Completed</h2>
    <p>Hi ${user.name || 'there'},</p>
    <p>A task for your SEO request has been completed!</p>
    
    <h3>Request Details:</h3>
    <div class="task-item">
      <div class="task-title">${request.title}</div>
      <div class="task-meta">
        Package: ${request.packageType || 'N/A'} | 
        Status: <span class="status-badge status-${request.status.toLowerCase()}">${request.status}</span>
      </div>
    </div>
    
    <h3>Completed Task:</h3>
    <div class="task-item">
      <div class="task-title">${taskDetails.title}</div>
      <div class="task-meta">
        Type: ${taskDetails.type} | 
        ${taskDetails.url ? `<a href="${taskDetails.url}">View Content</a>` : ''}
      </div>
    </div>
    
    <h3>Progress This Month:</h3>
    <ul>
      ${request.pagesCompleted > 0 ? `<li>Pages Completed: ${request.pagesCompleted}</li>` : ''}
      ${request.blogsCompleted > 0 ? `<li>Blogs Completed: ${request.blogsCompleted}</li>` : ''}
      ${request.gbpPostsCompleted > 0 ? `<li>GBP Posts Completed: ${request.gbpPostsCompleted}</li>` : ''}
      ${request.improvementsCompleted > 0 ? `<li>Improvements Completed: ${request.improvementsCompleted}</li>` : ''}
    </ul>
    
    <a href="${process.env.NEXT_PUBLIC_APP_URL}/requests" class="button">View All Requests</a>
  `

  return {
    subject: `Task Completed: ${taskDetails.title}`,
    html: baseTemplate(content, unsubscribeUrl)
  }
}

// Weekly summary template
export function weeklySummaryTemplate(
  user: User,
  summary: {
    totalRequests: number
    completedRequests: number
    inProgressRequests: number
    completedTasks: Array<{ title: string; type: string; completedAt: Date }>
    upcomingTasks: Array<{ title: string; type: string; priority: string }>
  }
): { subject: string; html: string } {
  const unsubscribeUrl = getUnsubscribeUrl(user.id, 'weeklySummary')
  
  const content = `
    <h2>Your Weekly SEO Hub Summary</h2>
    <p>Hi ${user.name || 'there'},</p>
    <p>Here's your weekly progress report for the week ending ${format(new Date(), 'MMMM d, yyyy')}.</p>
    
    <h3>Request Overview</h3>
    <ul>
      <li>Total Active Requests: <strong>${summary.totalRequests}</strong></li>
      <li>Completed This Week: <strong>${summary.completedRequests}</strong></li>
      <li>Currently In Progress: <strong>${summary.inProgressRequests}</strong></li>
    </ul>
    
    ${summary.completedTasks.length > 0 ? `
      <h3>Completed Tasks This Week</h3>
      ${summary.completedTasks.map(task => `
        <div class="task-item">
          <div class="task-title">${task.title}</div>
          <div class="task-meta">
            Type: ${task.type} | 
            Completed: ${format(task.completedAt, 'MMM d, yyyy')}
          </div>
        </div>
      `).join('')}
    ` : ''}
    
    ${summary.upcomingTasks.length > 0 ? `
      <h3>Upcoming Tasks</h3>
      ${summary.upcomingTasks.map(task => `
        <div class="task-item">
          <div class="task-title">${task.title}</div>
          <div class="task-meta">
            Type: ${task.type} | 
            Priority: ${task.priority}
          </div>
        </div>
      `).join('')}
    ` : ''}
    
    <p>Keep up the great work on your SEO efforts!</p>
    
    <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" class="button">View Dashboard</a>
  `

  return {
    subject: 'Your Weekly SEO Hub Summary',
    html: baseTemplate(content, unsubscribeUrl)
  }
}