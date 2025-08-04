# Google Analytics 4 Integration Guide

This guide explains how to integrate Google Analytics 4 (GA4) with the Rylie SEO Hub platform, including authentication, data retrieval, and troubleshooting.

## Table of Contents

- [Overview](#overview)
- [Integration Architecture](#integration-architecture)
- [Common Patterns](#common-patterns)
- [Authentication Flow](#authentication-flow)
- [API Endpoints](#api-endpoints)
- [Data Models](#data-models)
- [GA4 Data Retrieval](#ga4-data-retrieval)
- [Report Configuration](#report-configuration)
- [Dashboard Integration](#dashboard-integration)
- [Troubleshooting](#troubleshooting)
- [Security Considerations](#security-considerations)
- [Extending the Integration](#extending-the-integration)

## Overview

The Rylie SEO Hub platform integrates with Google Analytics 4 to provide SEO performance data directly within the platform. This integration allows users to:

- Connect their GA4 properties
- View key traffic metrics
- Analyze page performance
- Monitor SEO campaigns
- Generate custom reports

## Integration Architecture

The GA4 integration uses the Google Analytics Data API (GA4) with the following components:

- **OAuth Authentication**: Secure user authentication with Google's OAuth 2.0
- **Token Management**: Secure storage and refresh of access tokens
- **GA4 API Client**: Integration with the Google Analytics Data API
- **Data Caching**: Performance optimization through strategic caching
- **Report Generation**: Predefined and custom report templates

```
┌───────────────────┐         ┌───────────────────┐
│                   │         │                   │
│   Rylie SEO Hub   │◄────────┤   Google OAuth    │
│                   │         │                   │
└───────────┬───────┘         └───────────────────┘
            │                             
            ▼                             
┌───────────────────┐         ┌───────────────────┐
│                   │         │                   │
│   GA4 API Client  │◄────────┤   GA4 Data API    │
│                   │         │                   │
└───────────┬───────┘         └───────────────────┘
            │                             
            ▼                             
┌───────────────────┐         ┌───────────────────┐
│                   │         │                   │
│  Data Processing  │────────►│    Dashboard      │
│                   │         │                   │
└───────────────────┘         └───────────────────┘
```

## Common Patterns

### Error Handling
All API endpoints use this standard error handling pattern:

```typescript
try {
  // API logic here
} catch (error) {
  console.error('Operation error:', error);
  return new Response(JSON.stringify({ 
    error: 'Operation failed',
    details: error.message
  }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### Session Validation
All protected endpoints start with:

```typescript
const session = await getServerSession(authOptions);
if (!session) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

## Authentication Flow

### OAuth Setup

```typescript
// lib/ga4/auth.ts
import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXTAUTH_URL}/api/ga4/callback`
);

export function getAuthUrl() {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/analytics.readonly'],
    prompt: 'consent'
  });
}

export async function getTokens(code: string) {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}
```

### Token Storage & Refresh

```typescript
// lib/ga4/auth.ts
import { prisma } from '@/lib/db';
import { encrypt, decrypt } from '@/lib/encryption';

export async function storeTokens(userId: string, tokens: any) {
  return prisma.gA4Connection.upsert({
    where: { userId },
    update: {
      accessToken: encrypt(tokens.access_token),
      refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null
    },
    create: {
      userId,
      accessToken: encrypt(tokens.access_token),
      refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null
    }
  });
}

export async function getValidAccessToken(userId: string) {
  const connection = await prisma.gA4Connection.findUnique({
    where: { userId }
  });
  
  if (!connection) {
    throw new Error('GA4 connection not found');
  }
  
  const isExpired = connection.expiresAt && connection.expiresAt < new Date();
  
  if (isExpired && connection.refreshToken) {
    oauth2Client.setCredentials({
      refresh_token: decrypt(connection.refreshToken)
    });
    
    const { credentials } = await oauth2Client.refreshAccessToken();
    await storeTokens(userId, credentials);
    return credentials.access_token;
  }
  
  return decrypt(connection.accessToken);
}
```

## API Endpoints

### `GET /api/ga4/auth-url`
Returns OAuth URL for connecting GA4.

### `GET /api/ga4/callback`
Handles OAuth callback and stores tokens.

### `GET /api/ga4/properties`
Returns available GA4 properties for the authenticated user.

### `POST /api/ga4/select-property`
Selects a GA4 property for use.

### `GET /api/ga4/report`
Retrieves GA4 report data with caching:

```typescript
// app/api/ga4/report/route.ts
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return unauthorizedResponse();
  
  try {
    const url = new URL(req.url);
    const reportType = url.searchParams.get('type') || 'overview';
    const startDate = url.searchParams.get('startDate') || '7daysAgo';
    const endDate = url.searchParams.get('endDate') || 'today';
    
    const connection = await prisma.gA4Connection.findUnique({
      where: { userId: session.user.id }
    });
    
    if (!connection?.propertyId) {
      return propertyNotSelectedResponse();
    }
    
    // Check cache first
    const cacheKey = `ga4_${reportType}_${connection.propertyId}_${startDate}_${endDate}_${session.user.id}`;
    const cachedData = await getCachedReport(cacheKey);
    if (cachedData) return jsonResponse({ data: cachedData });
    
    // Fetch fresh data
    const accessToken = await getValidAccessToken(session.user.id);
    const reportData = await runReport({
      accessToken,
      propertyId: connection.propertyId,
      reportType,
      startDate,
      endDate
    });
    
    // Cache results (TTL: 5 minutes)
    await cacheReport(cacheKey, reportData, 300);
    return jsonResponse({ data: reportData });
  } catch (error) {
    return errorResponse('Failed to fetch GA4 report', error);
  }
}
```

## Data Models

### GA4Connection Model

```prisma
model GA4Connection {
  id     String @id @default(cuid())
  userId String @unique
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Encrypted tokens
  accessToken  String    @db.Text
  refreshToken String?   @db.Text
  expiresAt    DateTime?

  // GA4 specific
  propertyId   String?
  propertyName String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## GA4 Data Retrieval

### Property Listing

```typescript
// lib/ga4/properties.ts
export async function getGA4Properties(accessToken: string) {
  const analyticsAdmin = google.analyticsadmin({
    version: 'v1alpha',
    auth: accessToken
  });
  
  const response = await analyticsAdmin.properties.list();
  return response.data.properties || [];
}
```

### Reporting

```typescript
// lib/ga4/reports.ts
import { BetaAnalyticsDataClient } from '@google-analytics/data';

const reportConfigs = {
  overview: {
    dimensions: [{ name: 'date' }],
    metrics: [
      { name: 'sessions' },
      { name: 'totalUsers' },
      { name: 'screenPageViews' },
      { name: 'bounceRate' },
      { name: 'averageSessionDuration' }
    ]
  },
  traffic: {
    dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
    metrics: [
      { name: 'sessions' },
      { name: 'totalUsers' },
      { name: 'newUsers' },
      { name: 'engagementRate' }
    ],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 20
  },
  pages: {
    dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
    metrics: [
      { name: 'screenPageViews' },
      { name: 'averageSessionDuration' },
      { name: 'bounceRate' }
    ],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: 50
  }
};

export async function runReport({ 
  accessToken, 
  propertyId, 
  reportType = 'overview',
  startDate = '7daysAgo',
  endDate = 'today' 
}) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  
  const analyticsDataClient = new BetaAnalyticsDataClient({ auth });
  const config = reportConfigs[reportType] || reportConfigs.overview;
  
  const request = {
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate, endDate }],
    dimensions: config.dimensions,
    metrics: config.metrics,
    orderBys: config.orderBys,
    limit: config.limit
  };
  
  const [response] = await analyticsDataClient.runReport(request);
  return processReportResponse(response, reportType);
}

function processReportResponse(response, reportType) {
  if (!response?.rows?.length) {
    return { rows: [], totals: {} };
  }
  
  const rows = response.rows.map(row => {
    const formattedRow = {};
    
    response.dimensionHeaders.forEach((header, i) => {
      formattedRow[header.name] = row.dimensionValues[i].value;
    });
    
    response.metricHeaders.forEach((header, i) => {
      let value = row.metricValues[i].value;
      
      if (header.type === 'METRIC_TYPE_CURRENCY' || 
          header.type === 'METRIC_TYPE_FLOAT' || 
          header.type === 'METRIC_TYPE_INTEGER') {
        value = Number(value);
      }
      
      formattedRow[header.name] = value;
    });
    
    return formattedRow;
  });
  
  const totals = {};
  if (response.totals?.[0]) {
    response.metricHeaders.forEach((header, i) => {
      totals[header.name] = Number(response.totals[0].metricValues[i].value);
    });
  }
  
  return { 
    rows, 
    totals,
    dimensionHeaders: response.dimensionHeaders.map(h => h.name),
    metricHeaders: response.metricHeaders.map(h => h.name)
  };
}
```

## Report Configuration

| Report Type | Dimensions | Key Metrics |
|-------------|------------|-------------|
| **Overview** | Date | Sessions, Users, Pageviews, Bounce Rate, Session Duration |
| **Traffic** | Source/Medium | Sessions, Users, New Users, Engagement Rate |
| **Pages** | Page Path/Title | Pageviews, Session Duration, Bounce Rate |

### Custom Reports

```typescript
export async function runCustomReport({
  accessToken,
  propertyId,
  dimensions,
  metrics,
  startDate = '7daysAgo',
  endDate = 'today',
  orderBy = null,
  limit = 50
}) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  
  const analyticsDataClient = new BetaAnalyticsDataClient({ auth });
  
  const request = {
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate, endDate }],
    dimensions: dimensions.map(d => ({ name: d })),
    metrics: metrics.map(m => ({ name: m })),
    limit
  };
  
  if (orderBy) {
    request.orderBys = [{
      [orderBy.type]: { [orderBy.type + 'Name']: orderBy.name },
      desc: orderBy.desc
    }];
  }
  
  const [response] = await analyticsDataClient.runReport(request);
  return processReportResponse(response, 'custom');
}
```

## Dashboard Integration

### Data Caching

```typescript
// lib/ga4/cache.ts
export async function getCachedReport(key: string) {
  const cachedReport = await prisma.analyticsCache.findUnique({
    where: { key }
  });
  
  if (!cachedReport || cachedReport.expiresAt < new Date()) {
    if (cachedReport) {
      await prisma.analyticsCache.delete({ where: { key } });
    }
    return null;
  }
  
  return JSON.parse(cachedReport.data);
}

export async function cacheReport(key: string, data: any, ttlSeconds: number = 300) {
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + ttlSeconds);
  
  return prisma.analyticsCache.upsert({
    where: { key },
    update: { data: JSON.stringify(data), expiresAt },
    create: { key, data: JSON.stringify(data), expiresAt }
  });
}
```

### Chart Integration

```typescript
// components/analytics/OverviewChart.tsx
'use client';

import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { format, parseISO } from 'date-fns';

export default function OverviewChart() {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/ga4/report?type=overview');
        const data = await res.json();
        
        if (data.error) {
          setError(data.error);
          return;
        }
        
        const formattedData = data.data.rows.map(row => ({
          ...row,
          formattedDate: format(parseISO(row.date), 'MMM d')
        }));
        
        setChartData({
          labels: formattedData.map(row => row.formattedDate),
          datasets: [
            {
              label: 'Sessions',
              data: formattedData.map(row => row.sessions),
              borderColor: 'rgb(53, 162, 235)',
              backgroundColor: 'rgba(53, 162, 235, 0.5)',
            },
            {
              label: 'Users',
              data: formattedData.map(row => row.totalUsers),
              borderColor: 'rgb(255, 99, 132)',
              backgroundColor: 'rgba(255, 99, 132, 0.5)',
            }
          ]
        });
      } catch (err) {
        setError('Failed to fetch analytics data');
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, []);
  
  if (loading) return <div>Loading analytics data...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!chartData) return <div>No data available</div>;
  
  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <h2 className="text-lg font-semibold mb-4">Traffic Overview</h2>
      <Line 
        data={chartData}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          scales: { y: { beginAtZero: true } }
        }}
        height={300}
      />
    </div>
  );
}
```

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| **Token Refresh Errors** | Check refresh token storage, verify Google Cloud Console permissions, re-authenticate if necessary |
| **Property Access Issues** | Verify user has GA4 permissions, check propertyId correctness, ensure OAuth scope includes analytics.readonly |
| **API Quota Limits** | Implement aggressive caching (5-15 min TTL), batch requests, use exponential backoff |
| **Data Discrepancies** | Check date ranges/time zones, verify filter consistency, account for GA4 processing delays |

### Connection Checker

```typescript
// lib/ga4/troubleshoot.ts
export async function checkGA4Connection(userId: string) {
  try {
    const connection = await prisma.gA4Connection.findUnique({
      where: { userId }
    });
    
    if (!connection) {
      return { connected: false, error: 'No GA4 connection found' };
    }
    
    const accessToken = await getValidAccessToken(userId);
    
    // Test token with simple API call
    const analyticsAdmin = google.analyticsadmin({
      version: 'v1alpha',
      auth: accessToken
    });
    
    await analyticsAdmin.properties.list({ pageSize: 1 });
    
    return { connected: true, propertyId: connection.propertyId };
  } catch (error) {
    return {
      connected: false,
      error: 'Invalid or expired credentials',
      details: error.message
    };
  }
}
```

### Rate Limiting

```typescript
// lib/ga4/rateLimiting.ts
export async function fetchWithBackoff(fetchFn, maxRetries = 3) {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      return await fetchFn();
    } catch (error) {
      if (error.code === 429 || error.response?.status === 429) {
        retries++;
        
        if (retries >= maxRetries) {
          throw new Error('API quota exceeded after max retries');
        }
        
        const backoffTime = Math.min(
          1000 * Math.pow(2, retries) + Math.random() * 1000,
          30000
        );
        
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      } else {
        throw error;
      }
    }
  }
}
```

## Security Considerations

### Token Security
- Encrypt tokens before database storage
- Never expose tokens in client-side code
- Implement proper token rotation
- Use principle of least privilege

### User Permissions

```typescript
// lib/ga4/permissions.ts
export async function validatePropertyAccess(userId: string, propertyId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      ga4Connection: true,
      agency: {
        include: {
          users: {
            where: { role: 'AGENCY_ADMIN' },
            select: { ga4Connection: true }
          }
        }
      }
    }
  });
  
  if (!user) return false;
  
  // Check if this is the user's property
  if (user.ga4Connection?.propertyId === propertyId) {
    return true;
  }
  
  // For agency admins, check if property belongs to agency user
  if (user.role === 'AGENCY_ADMIN' || user.role === 'SUPER_ADMIN') {
    if (user.agency) {
      const agencyUsers = await prisma.user.findMany({
        where: { agencyId: user.agencyId },
        include: { ga4Connection: true }
      });
      
      return agencyUsers.some(
        agencyUser => agencyUser.ga4Connection?.propertyId === propertyId
      );
    }
  }
  
  return false;
}
```

## Extending the Integration

### Custom Dimensions and Metrics

```typescript
// lib/ga4/customDimensions.ts
export async function getCustomDimensions(accessToken: string, propertyId: string) {
  const analyticsAdmin = google.analyticsadmin({
    version: 'v1alpha',
    auth: accessToken
  });
  
  const response = await analyticsAdmin.properties.customDimensions.list({
    parent: `properties/${propertyId}`
  });
  
  return response.data.customDimensions || [];
}

export async function getCustomMetrics(accessToken: string, propertyId: string) {
  const analyticsAdmin = google.analyticsadmin({
    version: 'v1alpha',
    auth: accessToken
  });
  
  const response = await analyticsAdmin.properties.customMetrics.list({
    parent: `properties/${propertyId}`
  });
  
  return response.data.customMetrics || [];
}
```

### Multi-Property Support

```typescript
// Extended model for multiple properties
model GA4Connection {
  id     String @id @default(cuid())
  userId String @unique
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  accessToken  String    @db.Text
  refreshToken String?   @db.Text
  expiresAt    DateTime?

  properties GA4Property[]
  defaultPropertyId String?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model GA4Property {
  id           String @id @default(cuid())
  connectionId String
  connection   GA4Connection @relation(fields: [connectionId], references: [id], onDelete: Cascade)
  
  propertyId   String
  propertyName String
  
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  @@unique([connectionId, propertyId])
}
```

### Automated Reports

```typescript
// lib/ga4/scheduledReports.ts
export async function setupWeeklyReport(userId: string, reportConfig: any) {
  return prisma.scheduledReport.create({
    data: {
      userId,
      frequency: 'WEEKLY',
      day: reportConfig.day,
      reportType: reportConfig.type,
      dateRange: reportConfig.dateRange,
      recipients: reportConfig.recipients,
      name: reportConfig.name,
      enabled: true
    }
  });
}

export async function generateAndSendReport(reportId: string) {
  const report = await prisma.scheduledReport.findUnique({
    where: { id: reportId },
    include: { user: { include: { ga4Connection: true } } }
  });
  
  if (!report?.enabled || !report.user.ga4Connection) {
    return { success: false, error: 'Report not found or disabled' };
  }
  
  try {
    const accessToken = await getValidAccessToken(report.userId);
    
    const reportData = await runReport({
      accessToken,
      propertyId: report.user.ga4Connection.propertyId,
      reportType: report.reportType,
      startDate: calculateStartDate(report.dateRange),
      endDate: 'yesterday'
    });
    
    const htmlReport = generateReportHtml(reportData, report);
    
    await sendReportEmail({
      to: report.recipients,
      subject: `${report.name} - ${new Date().toLocaleDateString()}`,
      html: htmlReport
    });
    
    await prisma.reportLog.create({
      data: {
        reportId: report.id,
        status: 'SUCCESS',
        sentAt: new Date(),
        recipients: report.recipients
      }
    });
    
    return { success: true };
  } catch (error) {
    await prisma.reportLog.create({
      data: {
        reportId: report.id,
        status: 'ERROR',
        sentAt: new Date(),
        errorMessage: error.message
      }
    });
    
    return { success: false, error: error.message };
  }
}
```

### Predictive Analytics

```typescript
// lib/ga4/predictions.ts
export function calculateTrend(data, metric, days = 30) {
  if (!data?.rows || data.rows.length < days) {
    return { trend: 0, prediction: null };
  }
  
  const values = data.rows.map(row => Number(row[metric]));
  
  const recentAvg = values.slice(-7).reduce((sum, val) => sum + val, 0) / 7;
  const previousAvg = values.slice(-14, -7).reduce((sum, val) => sum + val, 0) / 7;
  
  const percentChange = ((recentAvg - previousAvg) / previousAvg) * 100;
  
  const prediction = values.slice(-7).map((val, i) => {
    const growth = 1 + (percentChange / 100);
    return val * Math.pow(growth, i + 1);
  });
  
  return {
    trend: percentChange,
    prediction
  };
}
```