# Google Analytics 4 Integration Guide

This guide explains how to integrate Google Analytics 4 (GA4) with the Rylie SEO Hub platform, including authentication, data retrieval, and troubleshooting.

## Table of Contents

- [Overview](#overview)
- [Integration Architecture](#integration-architecture)
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
            │                             
            ▼                             
┌───────────────────┐         ┌───────────────────┐
│                   │         │                   │
│   GA4 API Client  │◄────────┤   GA4 Data API    │
│                   │         │                   │
└───────────┬───────┘         └───────────────────┘
            │                             
            │                             
            ▼                             
┌───────────────────┐         ┌───────────────────┐
│                   │         │                   │
│  Data Processing  │────────►│    Dashboard      │
│                   │         │                   │
└───────────────────┘         └───────────────────┘
```

## Authentication Flow

### Step 1: OAuth Consent Screen

To enable GA4 integration, the user must first authenticate through Google's OAuth:

```typescript
// lib/ga4/auth.ts
import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXTAUTH_URL}/api/ga4/callback`
);

export function getAuthUrl() {
  const scopes = [
    'https://www.googleapis.com/auth/analytics.readonly'
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent'
  });
}
```

### Step 2: Token Exchange

After the user consents, exchange the authorization code for access and refresh tokens:

```typescript
// lib/ga4/auth.ts
export async function getTokens(code: string) {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}
```

### Step 3: Token Storage

Store the tokens securely in the database:

```typescript
// lib/ga4/auth.ts
import { prisma } from '@/lib/db';
import { encrypt } from '@/lib/encryption';

export async function storeTokens(userId: string, tokens: any) {
  // Encrypt sensitive tokens before storage
  const encryptedAccessToken = encrypt(tokens.access_token);
  const encryptedRefreshToken = tokens.refresh_token ? encrypt(tokens.refresh_token) : null;
  
  // Store in database
  return prisma.gA4Connection.upsert({
    where: { userId },
    update: {
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null
    },
    create: {
      userId,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null
    }
  });
}
```

### Step 4: Token Refresh

Implement token refresh mechanism:

```typescript
// lib/ga4/auth.ts
import { decrypt } from '@/lib/encryption';

export async function getValidAccessToken(userId: string) {
  // Get stored tokens
  const connection = await prisma.gA4Connection.findUnique({
    where: { userId }
  });
  
  if (!connection) {
    throw new Error('GA4 connection not found');
  }
  
  // Check if token is expired
  const isExpired = connection.expiresAt && connection.expiresAt < new Date();
  
  if (isExpired && connection.refreshToken) {
    // Set up OAuth client with refresh token
    oauth2Client.setCredentials({
      refresh_token: decrypt(connection.refreshToken)
    });
    
    // Refresh token
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    // Update stored tokens
    await storeTokens(userId, credentials);
    
    return credentials.access_token;
  }
  
  // Return current access token
  return decrypt(connection.accessToken);
}
```

## API Endpoints

The platform provides several API endpoints for GA4 integration:

### `GET /api/ga4/auth-url`

Returns the OAuth URL for connecting GA4:

```typescript
// app/api/ga4/auth-url/route.ts
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getAuthUrl } from '@/lib/ga4/auth';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const url = getAuthUrl();
  
  return new Response(JSON.stringify({ url }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### `GET /api/ga4/callback`

Handles the OAuth callback:

```typescript
// app/api/ga4/callback/route.ts
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getTokens, storeTokens } from '@/lib/ga4/auth';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return redirect('/auth/signin');
  }
  
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  
  if (!code) {
    return redirect('/dashboard?error=ga4_auth_failed');
  }
  
  try {
    // Exchange code for tokens
    const tokens = await getTokens(code);
    
    // Store tokens
    await storeTokens(session.user.id, tokens);
    
    // Redirect to property selection
    return redirect('/dashboard/analytics/select-property');
  } catch (error) {
    console.error('GA4 authentication error:', error);
    return redirect('/dashboard?error=ga4_auth_failed');
  }
}
```

### `GET /api/ga4/properties`

Returns available GA4 properties:

```typescript
// app/api/ga4/properties/route.ts
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getValidAccessToken } from '@/lib/ga4/auth';
import { getGA4Properties } from '@/lib/ga4/properties';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    // Get valid access token
    const accessToken = await getValidAccessToken(session.user.id);
    
    // Get GA4 properties
    const properties = await getGA4Properties(accessToken);
    
    return new Response(JSON.stringify({ properties }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('GA4 properties error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch GA4 properties',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

### `POST /api/ga4/select-property`

Selects a GA4 property for use:

```typescript
// app/api/ga4/select-property/route.ts
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    const { propertyId, propertyName } = await req.json();
    
    // Update user's GA4 connection with the selected property
    await prisma.gA4Connection.update({
      where: { userId: session.user.id },
      data: {
        propertyId,
        propertyName
      }
    });
    
    return new Response(JSON.stringify({ 
      success: true,
      property: { id: propertyId, name: propertyName }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('GA4 property selection error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to select GA4 property',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

### `GET /api/ga4/report`

Retrieves GA4 report data:

```typescript
// app/api/ga4/report/route.ts
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getValidAccessToken } from '@/lib/ga4/auth';
import { runReport } from '@/lib/ga4/reports';
import { prisma } from '@/lib/db';
import { getCachedReport, cacheReport } from '@/lib/ga4/cache';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    const url = new URL(req.url);
    const reportType = url.searchParams.get('type') || 'overview';
    const startDate = url.searchParams.get('startDate') || '7daysAgo';
    const endDate = url.searchParams.get('endDate') || 'today';
    
    // Get user's GA4 connection
    const connection = await prisma.gA4Connection.findUnique({
      where: { userId: session.user.id }
    });
    
    if (!connection || !connection.propertyId) {
      return new Response(JSON.stringify({ 
        error: 'GA4 property not selected',
        redirectTo: '/dashboard/analytics/select-property'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Check cache first
    const cacheKey = `ga4_${reportType}_${connection.propertyId}_${startDate}_${endDate}_${session.user.id}`;
    const cachedData = await getCachedReport(cacheKey);
    
    if (cachedData) {
      return new Response(JSON.stringify({ data: cachedData }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Get valid access token
    const accessToken = await getValidAccessToken(session.user.id);
    
    // Run report based on type
    const reportData = await runReport({
      accessToken,
      propertyId: connection.propertyId,
      reportType,
      startDate,
      endDate
    });
    
    // Cache the results (TTL: 5 minutes)
    await cacheReport(cacheKey, reportData, 5 * 60);
    
    return new Response(JSON.stringify({ data: reportData }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('GA4 report error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch GA4 report',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

## Data Models

The platform uses the following data models for GA4 integration:

### GA4Connection Model

```prisma
// prisma/schema.prisma
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

The platform uses the Google Analytics Data API to retrieve analytics data:

### Property Listing

```typescript
// lib/ga4/properties.ts
import { google } from 'googleapis';

export async function getGA4Properties(accessToken: string) {
  const analyticsAdmin = google.analyticsadmin({
    version: 'v1alpha',
    auth: accessToken
  });
  
  const response = await analyticsAdmin.properties.list();
  
  return response.data.properties || [];
}
```

### Basic Reporting

```typescript
// lib/ga4/reports.ts
import { google } from 'googleapis';
import { BetaAnalyticsDataClient } from '@google-analytics/data';

// Report configuration based on type
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
  // Create auth client for BetaAnalyticsDataClient
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  
  // Create analytics data client
  const analyticsDataClient = new BetaAnalyticsDataClient({ auth });
  
  // Get report configuration
  const config = reportConfigs[reportType] || reportConfigs.overview;
  
  // Build request
  const request = {
    property: `properties/${propertyId}`,
    dateRanges: [
      {
        startDate,
        endDate
      }
    ],
    dimensions: config.dimensions,
    metrics: config.metrics,
    orderBys: config.orderBys,
    limit: config.limit
  };
  
  // Run report
  const [response] = await analyticsDataClient.runReport(request);
  
  // Process and format the response
  return processReportResponse(response, reportType);
}

function processReportResponse(response, reportType) {
  if (!response || !response.rows || response.rows.length === 0) {
    return { rows: [], totals: {} };
  }
  
  // Format row data based on the report type
  const rows = response.rows.map(row => {
    const formattedRow = {};
    
    // Process dimensions
    response.dimensionHeaders.forEach((header, i) => {
      formattedRow[header.name] = row.dimensionValues[i].value;
    });
    
    // Process metrics
    response.metricHeaders.forEach((header, i) => {
      formattedRow[header.name] = row.metricValues[i].value;
      
      // Convert numeric values where appropriate
      if (header.type === 'METRIC_TYPE_CURRENCY' || 
          header.type === 'METRIC_TYPE_FLOAT' || 
          header.type === 'METRIC_TYPE_INTEGER') {
        formattedRow[header.name] = Number(formattedRow[header.name]);
      }
      
      // Format percentages
      if (header.name.toLowerCase().includes('rate') || 
          header.name.toLowerCase().includes('percentage')) {
        formattedRow[header.name] = Number(formattedRow[header.name]);
      }
    });
    
    return formattedRow;
  });
  
  // Calculate totals
  const totals = {};
  if (response.totals && response.totals.length > 0) {
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

The platform supports various report types:

### Overview Report

Shows high-level metrics over time:
- Sessions
- Users
- Pageviews
- Bounce Rate
- Average Session Duration

### Traffic Sources Report

Shows traffic broken down by source and medium:
- Source/Medium
- Sessions
- Users
- New Users
- Engagement Rate

### Top Pages Report

Shows the most visited pages:
- Page Path
- Page Title
- Pageviews
- Average Session Duration
- Bounce Rate

### Custom Reports

Support for custom reports with user-defined dimensions and metrics:

```typescript
// lib/ga4/reports.ts
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
  // Create auth client
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  
  // Create analytics data client
  const analyticsDataClient = new BetaAnalyticsDataClient({ auth });
  
  // Format dimensions and metrics
  const formattedDimensions = dimensions.map(d => ({ name: d }));
  const formattedMetrics = metrics.map(m => ({ name: m }));
  
  // Build request
  const request = {
    property: `properties/${propertyId}`,
    dateRanges: [
      {
        startDate,
        endDate
      }
    ],
    dimensions: formattedDimensions,
    metrics: formattedMetrics,
    limit
  };
  
  // Add order by if specified
  if (orderBy) {
    request.orderBys = [{
      [orderBy.type]: { [orderBy.type + 'Name']: orderBy.name },
      desc: orderBy.desc
    }];
  }
  
  // Run report
  const [response] = await analyticsDataClient.runReport(request);
  
  // Process and format the response
  return processReportResponse(response, 'custom');
}
```

## Dashboard Integration

The GA4 data is integrated into the dashboard using charts and tables:

### Data Caching

To optimize performance and respect API quotas:

```typescript
// lib/ga4/cache.ts
import { prisma } from '@/lib/db';

export async function getCachedReport(key: string) {
  // Check if we have a cached version
  const cachedReport = await prisma.analyticsCache.findUnique({
    where: { key }
  });
  
  if (!cachedReport) {
    return null;
  }
  
  // Check if cache is expired
  if (cachedReport.expiresAt < new Date()) {
    // Delete expired cache
    await prisma.analyticsCache.delete({
      where: { key }
    });
    return null;
  }
  
  // Return cached data
  return JSON.parse(cachedReport.data);
}

export async function cacheReport(key: string, data: any, ttlSeconds: number = 300) {
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + ttlSeconds);
  
  // Store in cache
  return prisma.analyticsCache.upsert({
    where: { key },
    update: {
      data: JSON.stringify(data),
      expiresAt
    },
    create: {
      key,
      data: JSON.stringify(data),
      expiresAt
    }
  });
}
```

### Chart Integration

Example of integrating GA4 data with Chart.js:

```typescript
// components/analytics/OverviewChart.tsx
'use client';

import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { format, parseISO } from 'date-fns';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

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
        
        // Format dates for display
        const formattedData = data.data.rows.map(row => ({
          ...row,
          formattedDate: format(parseISO(row.date), 'MMM d')
        }));
        
        // Prepare chart data
        const chartData = {
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
            },
            {
              label: 'Pageviews',
              data: formattedData.map(row => row.screenPageViews),
              borderColor: 'rgb(75, 192, 192)',
              backgroundColor: 'rgba(75, 192, 192, 0.5)',
            }
          ]
        };
        
        setChartData(chartData);
      } catch (err) {
        setError('Failed to fetch analytics data');
        console.error(err);
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
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }}
        height={300}
      />
    </div>
  );
}
```

## Troubleshooting

### Common Issues and Solutions

#### Token Refresh Errors

If token refresh fails:

1. Check that the refresh token is stored correctly
2. Verify that the token is not corrupted
3. Check for permission changes in Google Cloud Console
4. Re-authenticate if necessary

```typescript
// lib/ga4/troubleshoot.ts
export async function checkGA4Connection(userId: string) {
  try {
    // Get connection
    const connection = await prisma.gA4Connection.findUnique({
      where: { userId }
    });
    
    if (!connection) {
      return { connected: false, error: 'No GA4 connection found' };
    }
    
    // Check token validity
    try {
      const accessToken = await getValidAccessToken(userId);
      
      // Test token with a simple API call
      const analyticsAdmin = google.analyticsadmin({
        version: 'v1alpha',
        auth: accessToken
      });
      
      await analyticsAdmin.properties.list({ pageSize: 1 });
      
      return { connected: true, propertyId: connection.propertyId };
    } catch (error) {
      // Token validation failed
      return {
        connected: false,
        error: 'Invalid or expired credentials',
        details: error.message
      };
    }
  } catch (error) {
    return { connected: false, error: 'Connection check failed', details: error.message };
  }
}
```

#### Property Access Issues

If the user can't access their GA4 property:

1. Verify the user has proper permissions in GA4
2. Check that the propertyId is correct
3. Ensure the OAuth scope includes analytics.readonly

#### API Quota Limits

To handle API quota limits:

1. Implement aggressive caching (TTL: 5-15 minutes)
2. Batch requests where possible
3. Implement exponential backoff for retries

```typescript
// lib/ga4/rateLimiting.ts
export async function fetchWithBackoff(fetchFn, maxRetries = 3) {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      return await fetchFn();
    } catch (error) {
      // Check if it's a quota error (429)
      if (error.code === 429 || (error.response && error.response.status === 429)) {
        retries++;
        
        if (retries >= maxRetries) {
          throw new Error('API quota exceeded after max retries');
        }
        
        // Calculate backoff time (exponential with jitter)
        const backoffTime = Math.min(
          1000 * Math.pow(2, retries) + Math.random() * 1000,
          30000
        );
        
        console.log(`GA4 API quota exceeded, retrying in ${backoffTime}ms (retry ${retries}/${maxRetries})`);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      } else {
        // Not a quota error, rethrow
        throw error;
      }
    }
  }
}
```

#### Data Discrepancies

If GA4 data doesn't match what's shown in Google Analytics:

1. Check date ranges for consistency
2. Verify time zones match
3. Confirm that filters are consistently applied
4. Remember that GA4 data can have slight processing delays

## Security Considerations

### Token Security

Protect sensitive token data:

1. Encrypt tokens before storing in the database
2. Never expose tokens in client-side code
3. Implement proper token rotation
4. Use the principle of least privilege

### User Permissions

Ensure proper permission handling:

1. Only allow users to access their own GA4 data
2. For agency admins, restrict access to agency properties
3. Validate property access on every request

```typescript
// lib/ga4/permissions.ts
export async function validatePropertyAccess(userId: string, propertyId: string) {
  // Get user and their connection
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
  
  if (!user) {
    return false;
  }
  
  // Check if this is the user's property
  if (user.ga4Connection && user.ga4Connection.propertyId === propertyId) {
    return true;
  }
  
  // For agency admins, check if they can access other users' properties
  if (user.role === 'AGENCY_ADMIN' || user.role === 'SUPER_ADMIN') {
    if (user.agency) {
      // Check if the property belongs to a user in their agency
      const agencyUsers = await prisma.user.findMany({
        where: { agencyId: user.agencyId },
        include: { ga4Connection: true }
      });
      
      return agencyUsers.some(
        agencyUser => agencyUser.ga4Connection && agencyUser.ga4Connection.propertyId === propertyId
      );
    }
  }
  
  return false;
}
```

## Extending the Integration

### Custom Dimensions and Metrics

Support for GA4 custom dimensions and metrics:

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

To support multiple GA4 properties per user:

1. Update the GA4Connection model to support multiple properties
2. Add a property selection UI
3. Store the default property for each user

```typescript
// Extended GA4Connection model
model GA4Connection {
  id     String @id @default(cuid())
  userId String @unique
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Encrypted tokens
  accessToken  String    @db.Text
  refreshToken String?   @db.Text
  expiresAt    DateTime?

  // Multiple properties support
  properties GA4Property[]
  
  // Default property
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

Set up automated email reports:

```typescript
// lib/ga4/scheduledReports.ts
export async function setupWeeklyReport(userId: string, reportConfig: any) {
  return prisma.scheduledReport.create({
    data: {
      userId,
      frequency: 'WEEKLY',
      day: reportConfig.day, // 0-6 (Sunday-Saturday)
      reportType: reportConfig.type,
      dateRange: reportConfig.dateRange,
      recipients: reportConfig.recipients,
      name: reportConfig.name,
      enabled: true
    }
  });
}

export async function generateAndSendReport(reportId: string) {
  // Get report config
  const report = await prisma.scheduledReport.findUnique({
    where: { id: reportId },
    include: { user: { include: { ga4Connection: true } } }
  });
  
  if (!report || !report.enabled || !report.user.ga4Connection) {
    return { success: false, error: 'Report not found or disabled' };
  }
  
  try {
    // Get access token
    const accessToken = await getValidAccessToken(report.userId);
    
    // Run report
    const reportData = await runReport({
      accessToken,
      propertyId: report.user.ga4Connection.propertyId,
      reportType: report.reportType,
      startDate: calculateStartDate(report.dateRange),
      endDate: 'yesterday'
    });
    
    // Generate report HTML
    const htmlReport = generateReportHtml(reportData, report);
    
    // Send email
    const emailResult = await sendReportEmail({
      to: report.recipients,
      subject: `${report.name} - ${new Date().toLocaleDateString()}`,
      html: htmlReport
    });
    
    // Log success
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
    // Log error
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

Implement simple trend predictions based on GA4 data:

```typescript
// lib/ga4/predictions.ts
export function calculateTrend(data, metric, days = 30) {
  // Ensure we have enough data
  if (!data || !data.rows || data.rows.length < days) {
    return { trend: 0, prediction: null };
  }
  
  // Get the specified metric values
  const values = data.rows.map(row => Number(row[metric]));
  
  // Calculate simple moving average
  const recentAvg = values.slice(-7).reduce((sum, val) => sum + val, 0) / 7;
  const previousAvg = values.slice(-14, -7).reduce((sum, val) => sum + val, 0) / 7;
  
  // Calculate percentage change
  const percentChange = ((recentAvg - previousAvg) / previousAvg) * 100;
  
  // Simple prediction for next 7 days
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
