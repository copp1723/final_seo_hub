# Authentication Guide

This guide explains the authentication system in the Rylie SEO Hub platform, covering user authentication, session management, API authentication, and role-based access control.

## Table of Contents

- [Overview](#overview)
- [Authentication Methods](#authentication-methods)
  - [Google OAuth](#google-oauth)
  - [API Keys](#api-keys)
- [Role-Based Access Control](#role-based-access-control)
  - [User Roles](#user-roles)
  - [Permission Hierarchy](#permission-hierarchy)
  - [Custom Permissions](#custom-permissions)
- [Session Management](#session-management)
  - [Session Storage](#session-storage)
  - [Session Expiry](#session-expiry)
  - [Session Security](#session-security)
- [Implementation Details](#implementation-details)
  - [NextAuth Configuration](#nextauth-configuration)
  - [Middleware Setup](#middleware-setup)
  - [API Route Protection](#api-route-protection)
- [Security Best Practices](#security-best-practices)
- [Common Issues & Troubleshooting](#common-issues--troubleshooting)
- [Custom Authentication Extensions](#custom-authentication-extensions)

## Overview

The Rylie SEO Hub platform uses NextAuth.js v5 for authentication with a multi-tenant, role-based access control system. The platform supports:

- Google OAuth for user authentication
- API keys for programmatic access
- Multi-tenant architecture with agency isolation
- Role-based access control with granular permissions
- Secure session management with database storage

## Authentication Methods

### Google OAuth

The primary authentication method is Google OAuth, which allows users to sign in with their Google accounts.

#### Setup Process

1. **Configure Google OAuth credentials** in the [Google Cloud Console](https://console.cloud.google.com/):
   - Create OAuth 2.0 Client ID credentials
   - Add authorized redirect URIs (e.g., `https://your-domain.com/api/auth/callback/google`)
   - Note the Client ID and Client Secret

2. **Add environment variables** to your `.env` file:
   ```
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

3. **Configure allowed email domains** (optional):
   - In `lib/auth.ts`, update the `allowedEmailDomains` array to restrict access to specific email domains
   - Use an empty array to allow all email domains

#### Authentication Flow

1. User clicks "Sign in with Google"
2. User is redirected to Google OAuth consent screen
3. User grants permission
4. User is redirected back to the application
5. NextAuth creates or updates the user record
6. Session is created and user is authenticated

### API Keys

For programmatic access to the API, the platform supports API key authentication.

#### Generating API Keys

API keys can be generated through:

1. **User Interface**:
   - Navigate to User Settings → API Access
   - Click "Generate API Key"
   - Copy and securely store the API key

2. **API Endpoint**:
   ```bash
   curl -X POST https://your-domain.com/api/auth/apikey \
     -H "Content-Type: application/json" \
     -H "Cookie: next-auth.session-token=your-session-token"
   ```

#### Using API Keys

API keys should be included in the `X-API-Key` header:

```bash
curl https://your-domain.com/api/requests \
  -H "X-API-Key: rylie_api_xxxxxxxxxxxxx"
```

#### API Key Security

- API keys are stored securely as hashed values in the database
- Keys have the format `rylie_api_` followed by a random string
- Keys can be revoked at any time
- Usage is logged for audit purposes

## Role-Based Access Control

The platform implements a comprehensive role-based access control (RBAC) system.

### User Roles

The platform has four primary roles:

1. **USER**: Basic access to create and view own requests
   - Can create and manage their own requests
   - Can access their own analytics data
   - Can use the AI chat assistant

2. **ADMIN**: Enhanced permissions within their agency
   - All USER permissions
   - Can view and manage all requests within their agency
   - Can manage users within their agency
   - Can access agency-wide analytics

3. **AGENCY_ADMIN**: Full control over agency users and requests
   - All ADMIN permissions
   - Can create and manage admins within their agency
   - Can configure agency settings
   - Can access advanced analytics and reporting

4. **SUPER_ADMIN**: System-wide administrative access
   - All AGENCY_ADMIN permissions
   - Can manage all agencies, users, and requests
   - Can configure system-wide settings
   - Can access system metrics and logs

### Permission Hierarchy

Permissions follow a hierarchical model:

```
USER < ADMIN < AGENCY_ADMIN < SUPER_ADMIN
```

Each role inherits all permissions of roles below it.

### Custom Permissions

For finer-grained control, the platform implements custom permission checks:

```typescript
// Example permission check in an API route
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  
  // Check if user has permission to manage users
  if (!hasPermission(session.user, "manage:users")) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" }
    });
  }
  
  // Process the request...
}
```

#### Common Permission Types

The platform defines several permission types:

- `read:own`: Read access to own resources
- `write:own`: Write access to own resources
- `read:agency`: Read access to agency resources
- `write:agency`: Write access to agency resources
- `manage:users`: User management within agency
- `manage:agency`: Agency management
- `admin:system`: System-wide administration

## Session Management

### Session Storage

The platform uses database-backed sessions for reliable session management:

- Sessions are stored in the `Session` table in the database
- Session tokens are securely generated and validated
- Database storage enables cross-instance session sharing
- Expired sessions are automatically cleaned up

### Session Expiry

Session expiry is configured in `lib/auth.ts`:

```typescript
// Session configuration
session: {
  strategy: "database",
  maxAge: 30 * 24 * 60 * 60, // 30 days
  updateAge: 24 * 60 * 60, // 24 hours
}
```

- Default session duration is 30 days
- Sessions are refreshed every 24 hours of activity
- The expiry time can be adjusted in the system settings

### Session Security

Several measures ensure session security:

- HTTP-only cookies prevent JavaScript access
- Secure flag ensures cookies are only sent over HTTPS
- SameSite policy prevents CSRF attacks
- Session tokens are cryptographically secure
- Redis-based CSRF protection (optional)

## Implementation Details

### NextAuth Configuration

The core authentication logic is in `lib/auth.ts`:

```typescript
// lib/auth.ts
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/db";

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    session: async ({ session, user }) => {
      // Add user role and ID to session
      if (session.user) {
        session.user.id = user.id;
        
        // Get user data from database
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true, agencyId: true, onboardingCompleted: true },
        });
        
        if (dbUser) {
          session.user.role = dbUser.role;
          session.user.agencyId = dbUser.agencyId;
          session.user.onboardingCompleted = dbUser.onboardingCompleted;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
};

export default NextAuth(authOptions);
```

### Middleware Setup

The application uses Next.js middleware for route protection:

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Exclude public paths
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/auth') ||
    pathname === '/api/health'
  ) {
    return NextResponse.next();
  }
  
  // Check for API key in headers for API routes
  if (pathname.startsWith('/api/')) {
    const apiKey = request.headers.get('X-API-Key');
    if (apiKey) {
      // Validate API key (implementation in separate file)
      const isValidApiKey = await validateApiKey(apiKey);
      if (isValidApiKey) {
        return NextResponse.next();
      }
    }
  }
  
  // Check for session token
  const token = await getToken({ req: request });
  if (!token) {
    // Redirect to sign-in for page routes, return 401 for API routes
    if (pathname.startsWith('/api/')) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'content-type': 'application/json' } }
      );
    }
    
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }
  
  // Check if user has completed onboarding
  if (
    !token.onboardingCompleted &&
    !pathname.startsWith('/onboarding') &&
    !pathname.startsWith('/api/onboarding')
  ) {
    if (pathname.startsWith('/api/')) {
      return new NextResponse(
        JSON.stringify({ error: 'Onboarding required' }),
        { status: 403, headers: { 'content-type': 'application/json' } }
      );
    }
    
    return NextResponse.redirect(new URL('/onboarding', request.url));
  }
  
  // Check role-based access for protected routes
  if (
    (pathname.startsWith('/admin') && token.role !== 'ADMIN' && token.role !== 'AGENCY_ADMIN' && token.role !== 'SUPER_ADMIN') ||
    (pathname.startsWith('/agency-admin') && token.role !== 'AGENCY_ADMIN' && token.role !== 'SUPER_ADMIN') ||
    (pathname.startsWith('/super-admin') && token.role !== 'SUPER_ADMIN')
  ) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  return NextResponse.next();
}
```

### API Route Protection

API routes are protected using a combination of middleware and route handlers:

```typescript
// Example API route with role-based protection
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  
  // Get agency-specific data for admins or all data for super admins
  let requestsQuery = {};
  
  if (session.user.role === "SUPER_ADMIN") {
    // No filter - can see all
  } else if (session.user.role === "AGENCY_ADMIN" || session.user.role === "ADMIN") {
    // Filter by agency
    requestsQuery = {
      where: {
        agencyId: session.user.agencyId
      }
    };
  } else {
    // Regular user - filter by user ID
    requestsQuery = {
      where: {
        userId: session.user.id
      }
    };
  }
  
  const requests = await prisma.request.findMany(requestsQuery);
  
  return new Response(JSON.stringify({ requests }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}
```

## Security Best Practices

The platform implements several security best practices:

1. **Rate Limiting**: API endpoints are rate-limited to prevent abuse
   ```typescript
   // Rate limiting middleware using Redis
   import { rateLimit } from "@/lib/rate-limit";
   
   // Limit to 60 requests per minute
   const limiter = rateLimit({
     interval: 60 * 1000,
     uniqueTokenPerInterval: 500,
     limit: 60,
   });
   
   export async function POST(req: Request) {
     try {
       await limiter.check(req);
     } catch {
       return new Response("Too Many Requests", { status: 429 });
     }
     
     // Process the request...
   }
   ```

2. **CSRF Protection**: Cross-Site Request Forgery protection
   ```typescript
   // CSRF token validation
   import { validateCSRFToken } from "@/lib/csrf";
   
   export async function POST(req: Request) {
     const csrfToken = req.headers.get("X-CSRF-Token");
     
     if (!csrfToken || !(await validateCSRFToken(csrfToken))) {
       return new Response("Invalid CSRF token", { status: 403 });
     }
     
     // Process the request...
   }
   ```

3. **Input Validation**: All user inputs are validated using Zod
   ```typescript
   import { z } from "zod";
   
   const userSchema = z.object({
     name: z.string().min(2).max(100),
     email: z.string().email(),
     role: z.enum(["USER", "ADMIN", "AGENCY_ADMIN", "SUPER_ADMIN"]),
   });
   
   export async function POST(req: Request) {
     const data = await req.json();
     
     try {
       const validatedData = userSchema.parse(data);
       // Process validated data...
     } catch (error) {
       return new Response(JSON.stringify({ error: "Invalid input data" }), {
         status: 400,
         headers: { "Content-Type": "application/json" }
       });
     }
   }
   ```

4. **Audit Logging**: Security-relevant actions are logged
   ```typescript
   // Audit logging example
   import { logAuditEvent } from "@/lib/audit";
   
   export async function POST(req: Request) {
     // Process request...
     
     // Log the action
     await logAuditEvent({
       userId: session.user.id,
       action: "USER_CREATE",
       resource: "User",
       resourceId: newUser.id,
       details: { role: newUser.role },
       ipAddress: req.headers.get("x-forwarded-for") || "unknown",
       userAgent: req.headers.get("user-agent") || "unknown",
     });
     
     // Return response...
   }
   ```

5. **Secure Headers**: HTTP security headers
   ```typescript
   // Configured in next.config.ts
   const securityHeaders = [
     {
       key: 'X-DNS-Prefetch-Control',
       value: 'on',
     },
     {
       key: 'Strict-Transport-Security',
       value: 'max-age=63072000; includeSubDomains; preload',
     },
     {
       key: 'X-XSS-Protection',
       value: '1; mode=block',
     },
     {
       key: 'X-Frame-Options',
       value: 'SAMEORIGIN',
     },
     {
       key: 'X-Content-Type-Options',
       value: 'nosniff',
     },
     {
       key: 'Referrer-Policy',
       value: 'strict-origin-when-cross-origin',
     },
   ];
   ```

## Common Issues & Troubleshooting

### Session Not Persisting

**Issue**: User is logged out unexpectedly or session doesn't persist across browser restarts.

**Solutions**:
1. Check `NEXTAUTH_URL` environment variable matches your domain exactly
2. Ensure `NEXTAUTH_SECRET` is set and consistent across deployments
3. Verify database connection for session storage
4. Check for cookie settings conflicts in headers or CSP

### Permission Errors

**Issue**: User has the correct role but still receives "Forbidden" errors.

**Solutions**:
1. Verify session callback is correctly adding user role to session
2. Check for case sensitivity in role comparisons
3. Ensure the user's agency relationship is correctly established
4. Restart the application to clear any cached session data

### API Key Not Working

**Issue**: API requests using API key authentication fail with 401 errors.

**Solutions**:
1. Verify the API key is correctly formatted and included in the `X-API-Key` header
2. Check if the API key has been revoked or expired
3. Ensure the endpoint supports API key authentication
4. Check rate limiting settings

### OAuth Errors

**Issue**: Error during Google OAuth login process.

**Solutions**:
1. Verify Google OAuth credentials are correct
2. Check authorized redirect URIs in Google Cloud Console
3. Ensure your domain is verified in Google Cloud Console
4. Clear browser cookies and cache

## Custom Authentication Extensions

### Adding Additional OAuth Providers

To add additional OAuth providers:

1. Install the provider package:
   ```bash
   npm install @auth/core @auth/microsoft-provider
   ```

2. Update `lib/auth.ts`:
   ```typescript
   import MicrosoftProvider from "@auth/microsoft-provider";
   
   export const authOptions = {
     // Existing configuration...
     providers: [
       GoogleProvider({
         clientId: process.env.GOOGLE_CLIENT_ID!,
         clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
       }),
       MicrosoftProvider({
         clientId: process.env.MICROSOFT_CLIENT_ID!,
         clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
         tenantId: process.env.MICROSOFT_TENANT_ID,
       }),
     ],
     // Rest of configuration...
   };
   ```

3. Update environment variables with new provider credentials

### Implementing Two-Factor Authentication

For enhanced security, you can implement two-factor authentication:

1. Install required packages:
   ```bash
   npm install @simplewebauthn/server @simplewebauthn/browser
   ```

2. Create a 2FA setup endpoint:
   ```typescript
   // app/api/auth/2fa/setup/route.ts
   import { getServerSession } from "next-auth/next";
   import { authOptions } from "@/lib/auth";
   import { prisma } from "@/lib/db";
   import { generateRegistrationOptions } from "@simplewebauthn/server";
   
   export async function GET(req: Request) {
     const session = await getServerSession(authOptions);
     
     if (!session) {
       return new Response(JSON.stringify({ error: "Unauthorized" }), {
         status: 401,
         headers: { "Content-Type": "application/json" }
       });
     }
     
     // Generate registration options...
     
     return new Response(JSON.stringify({ options }), {
       status: 200,
       headers: { "Content-Type": "application/json" }
     });
   }
   ```

3. Create verification endpoints and update session logic

### Custom JWT Claims

To add custom claims to the JWT token:

```typescript
// lib/auth.ts
export const authOptions = {
  // Existing configuration...
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.agencyId = user.agencyId;
        
        // Add custom claims
        token.permissions = await getUserPermissions(user.id);
        token.features = await getUserFeatureFlags(user.id);
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.agencyId = token.agencyId;
        
        // Add custom claims
        session.user.permissions = token.permissions;
        session.user.features = token.features;
      }
      return session;
    },
  },
  // Rest of configuration...
};
```
