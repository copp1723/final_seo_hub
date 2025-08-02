# Developer Setup Guide

This guide provides step-by-step instructions for setting up a development environment for the Rylie SEO Hub platform.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
  - [Node.js and npm](#nodejs-and-npm)
  - [PostgreSQL](#postgresql)
  - [Redis (Optional)](#redis-optional)
  - [IDE Configuration](#ide-configuration)
- [Project Setup](#project-setup)
  - [Cloning the Repository](#cloning-the-repository)
  - [Installing Dependencies](#installing-dependencies)
  - [Environment Variables](#environment-variables)
  - [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
  - [Development Server](#development-server)
  - [Prisma Studio](#prisma-studio)
  - [Testing](#testing)
- [Development Workflow](#development-workflow)
  - [Code Structure](#code-structure)
  - [Component Development](#component-development)
  - [API Development](#api-development)
  - [Database Migrations](#database-migrations)
- [External Integrations](#external-integrations)
  - [Google OAuth](#google-oauth)
  - [Google Analytics 4](#google-analytics-4)
  - [Search Console](#search-console)
  - [SEOWorks](#seoworks)
  - [OpenAI](#openai)
  - [Mailgun](#mailgun)
- [Testing](#testing-1)
  - [Running Tests](#running-tests)
  - [Writing Tests](#writing-tests)
- [Common Issues & Troubleshooting](#common-issues--troubleshooting)
- [Additional Resources](#additional-resources)

## Prerequisites

Before setting up the Rylie SEO Hub development environment, ensure you have the following tools installed:

- **Node.js**: Version 18.x or higher
- **npm**: Version 8.x or higher
- **Git**: Latest version
- **PostgreSQL**: Version 14.x or higher
- **Redis** (optional): Version 6.x or higher
- **Code Editor**: Visual Studio Code (recommended) or any preferred IDE

## Environment Setup

### Node.js and npm

It's recommended to use Node Version Manager (nvm) for managing Node.js versions:

#### For macOS/Linux:

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash

# Reload shell configuration
source ~/.bashrc  # or source ~/.zshrc if using Zsh

# Install the correct Node.js version
nvm install 18
nvm use 18
```

#### For Windows:

1. Install [nvm-windows](https://github.com/coreybutler/nvm-windows/releases)
2. Open Command Prompt as Administrator
3. Run:
   ```
   nvm install 18
   nvm use 18
   ```

Verify your Node.js and npm installation:

```bash
node -v  # Should show v18.x.x
npm -v   # Should show v8.x.x or higher
```

### PostgreSQL

#### For macOS:

```bash
# Using Homebrew
brew install postgresql@14
brew services start postgresql@14

# Create database
createdb rylie_seo_hub_dev
```

#### For Linux (Ubuntu/Debian):

```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql-14 postgresql-contrib-14

# Start service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database (switch to postgres user first)
sudo -u postgres psql
CREATE USER developer WITH PASSWORD 'password';
CREATE DATABASE rylie_seo_hub_dev OWNER developer;
ALTER USER developer WITH SUPERUSER;
\q
```

#### For Windows:

1. Download and install [PostgreSQL](https://www.postgresql.org/download/windows/)
2. During installation, set a password for the postgres user
3. After installation, open pgAdmin or use the SQL Shell (psql) to create a database:
   ```
   CREATE DATABASE rylie_seo_hub_dev;
   ```

### Redis (Optional)

Redis is used for rate limiting and CSRF protection in production. For development, an in-memory provider is used by default, but you can set up Redis for a production-like environment.

#### For macOS:

```bash
brew install redis
brew services start redis
```

#### For Linux (Ubuntu/Debian):

```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

#### For Windows:

1. Download and install [Redis for Windows](https://github.com/tporadowski/redis/releases)
2. Start Redis server using the installed Redis Windows Service

### IDE Configuration

#### Visual Studio Code (Recommended)

1. Install VS Code from [https://code.visualstudio.com/](https://code.visualstudio.com/)
2. Install the following extensions:
   - ESLint
   - Prettier
   - Tailwind CSS IntelliSense
   - Prisma
   - GitLens
   - Typescript React code snippets

3. Configure VS Code settings (`.vscode/settings.json`):

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "prisma.prismaFmtOnSave": true
}
```

## Project Setup

### Cloning the Repository

```bash
# Clone the repository
git clone https://github.com/your-username/final_seo_hub.git
cd final_seo_hub
```

### Installing Dependencies

```bash
# Install dependencies
npm install
```

### Environment Variables

Create a `.env` file in the root directory based on the `.env.example` file:

```bash
cp .env.example .env
```

Edit the `.env` file and fill in the necessary values:

```
# Core Configuration
NODE_ENV=development
DATABASE_URL=postgresql://postgres:password@localhost:5432/rylie_seo_hub_dev
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-development-secret-key

# Redis (optional)
# REDIS_URL=redis://localhost:6379

# Google OAuth (required for authentication)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# API keys (only required if using these features)
OPENAI_API_KEY=your-openai-api-key
MAILGUN_API_KEY=your-mailgun-api-key
MAILGUN_DOMAIN=your-mailgun-domain
SEOWORKS_API_KEY=your-seoworks-api-key
```

### Database Setup

Initialize the database with the required schema:

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate:dev

# (Optional) Seed the database with initial data
npx prisma db seed
```

## Running the Application

### Development Server

Start the development server:

```bash
npm run dev
```

The application will be available at http://localhost:3000.

### Prisma Studio

Prisma Studio provides a visual interface for exploring and editing the database:

```bash
npm run db:studio
```

Prisma Studio will be available at http://localhost:5555.

### Testing

Run tests to ensure everything is set up correctly:

```bash
# Run all tests
npm test

# Run tests with watch mode
npm run test:watch

# Run specific tests
npm test -- -t "authentication"
```

## Development Workflow

### Code Structure

Understanding the codebase structure will help you navigate and develop efficiently:

- `app/`: Next.js App Router pages and API routes
  - `app/(authenticated)/`: Protected pages requiring authentication
  - `app/api/`: API endpoints for all functionality
  - `app/auth/`: Authentication-related pages

- `components/`: Reusable React components
  - `components/ui/`: UI components (buttons, forms, etc.)
  - `components/shared/`: Shared components used across pages
  - `components/requests/`: Request-related components

- `lib/`: Utility functions, services, and configurations
  - `lib/auth.ts`: NextAuth configuration
  - `lib/db.ts`: Prisma client instance
  - `lib/api/`: API utility functions
  - `lib/branding/`: White-label branding system

- `prisma/`: Database schema and migrations
  - `prisma/schema.prisma`: Database schema definition
  - `prisma/migrations/`: Migration history

- `types/`: TypeScript type definitions
  - `types/auth.ts`: Authentication-related types
  - `types/api.ts`: API-related types
  - `types/next.ts`: Next.js-specific types

- `middleware/`: Custom middleware functions
  - `middleware/rate-limit.ts`: Rate limiting middleware
  - `middleware/csrf.ts`: CSRF protection middleware

### Component Development

When developing UI components:

1. Create components in the appropriate directory under `components/`
2. Use TypeScript for type safety
3. Use Tailwind CSS for styling
4. Create small, reusable components
5. Use Radix UI for accessible UI components

Example component:

```tsx
// components/ui/Button.tsx
import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-primary text-white hover:bg-primary/90',
        outline: 'border border-input bg-transparent hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
```

### API Development

When developing API endpoints:

1. Create route handlers in the appropriate directory under `app/api/`
2. Use Next.js App Router API routes
3. Implement proper authentication and authorization
4. Validate input data
5. Handle errors consistently

Example API route:

```typescript
// app/api/requests/route.ts
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Input validation schema
const requestSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10),
  type: z.string(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  keywords: z.array(z.string()).optional(),
  targetUrl: z.string().url().optional(),
  targetCities: z.array(z.string()).optional(),
  targetModels: z.array(z.string()).optional()
});

export async function POST(req: Request) {
  // Authentication
  const session = await getServerSession(authOptions);
  
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    // Input validation
    const data = await req.json();
    const validatedData = requestSchema.parse(data);
    
    // Create request
    const request = await prisma.request.create({
      data: {
        ...validatedData,
        userId: session.user.id,
        agencyId: session.user.agencyId,
        status: 'PENDING',
        keywords: validatedData.keywords || [],
        targetCities: validatedData.targetCities || [],
        targetModels: validatedData.targetModels || []
      }
    });
    
    return new Response(JSON.stringify(request), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: 'Validation error', details: error.errors }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.error('Request creation error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
```

### Database Migrations

When making changes to the database schema:

1. Edit the `prisma/schema.prisma` file
2. Create a migration:
   ```bash
   npm run db:migrate:dev -- --name descriptive_name
   ```
3. Review the generated migration in `prisma/migrations/`
4. Apply the migration:
   ```bash
   npm run db:migrate:dev
   ```

## External Integrations

### Google OAuth

For Google OAuth authentication:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth client ID"
5. Select "Web application"
6. Add "http://localhost:3000" to "Authorized JavaScript origins"
7. Add "http://localhost:3000/api/auth/callback/google" to "Authorized redirect URIs"
8. Copy the Client ID and Client Secret to your `.env` file

### Google Analytics 4

For Google Analytics 4 integration:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the "Google Analytics Data API" for your project
3. Create an OAuth consent screen if you haven't already
4. Add the following scopes:
   - https://www.googleapis.com/auth/analytics.readonly

### Search Console

For Search Console integration:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the "Google Search Console API" for your project
3. Add the following scopes to your OAuth consent screen:
   - https://www.googleapis.com/auth/webmasters.readonly

### SEOWorks

For SEOWorks integration:

1. Obtain API credentials from SEOWorks
2. Add the SEOWorks API key to your `.env` file
3. For webhook testing, use a tool like [ngrok](https://ngrok.com/) to expose your local server:
   ```bash
   ngrok http 3000
   ```
4. Configure the webhook endpoint in SEOWorks to point to your ngrok URL:
   `https://your-ngrok-url.ngrok.io/api/seoworks/webhook`

### OpenAI

For OpenAI integration:

1. Create an account at [OpenAI](https://platform.openai.com/)
2. Generate an API key
3. Add the OpenAI API key to your `.env` file

### Mailgun

For email functionality:

1. Create an account at [Mailgun](https://www.mailgun.com/)
2. Set up a domain or use the sandbox domain for testing
3. Get the API key and domain
4. Add the Mailgun API key and domain to your `.env` file

## Testing

### Running Tests

The project uses Jest for testing:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific tests
npm test -- -t "authentication"
```

### Writing Tests

When writing tests:

1. Place test files next to the component or function being tested with a `.test.ts` or `.test.tsx` suffix
2. Use descriptive test names
3. Follow the Arrange-Act-Assert pattern
4. Mock external dependencies

Example component test:

```tsx
// components/ui/Button.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });
  
  it('calls onClick handler when clicked', async () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    await userEvent.click(screen.getByRole('button', { name: /click me/i }));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
  
  it('applies variant classes correctly', () => {
    render(<Button variant="outline">Outline Button</Button>);
    const button = screen.getByRole('button', { name: /outline button/i });
    
    expect(button).toHaveClass('border');
    expect(button).toHaveClass('border-input');
  });
});
```

Example API test:

```typescript
// app/api/requests/route.test.ts
import { POST } from './route';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/db';

// Mock dependencies
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  prisma: {
    request: {
      create: jest.fn(),
    },
  },
}));

describe('POST /api/requests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('returns 401 if user is not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    
    const req = new Request('http://localhost:3000/api/requests', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    
    const response = await POST(req);
    
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Unauthorized' });
  });
  
  it('creates a request successfully', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'user123', agencyId: 'agency123' },
    });
    
    const mockRequest = {
      id: 'request123',
      title: 'Test Request',
      description: 'Test description',
      type: 'page',
      priority: 'MEDIUM',
      userId: 'user123',
      agencyId: 'agency123',
      status: 'PENDING',
    };
    
    (prisma.request.create as jest.Mock).mockResolvedValue(mockRequest);
    
    const req = new Request('http://localhost:3000/api/requests', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Test Request',
        description: 'Test description',
        type: 'page',
        priority: 'MEDIUM',
      }),
    });
    
    const response = await POST(req);
    
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(mockRequest);
    expect(prisma.request.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: 'Test Request',
        description: 'Test description',
        type: 'page',
        priority: 'MEDIUM',
        userId: 'user123',
        agencyId: 'agency123',
        status: 'PENDING',
      }),
    });
  });
});
```

## Common Issues & Troubleshooting

### Next.js App Router Issues

If you encounter issues with the Next.js App Router:

1. Clear the Next.js cache:
   ```bash
   rm -rf .next
   ```
2. Restart the development server

### Prisma Issues

If you encounter Prisma-related issues:

1. Ensure your database is running
2. Verify your `DATABASE_URL` in the `.env` file
3. Regenerate the Prisma client:
   ```bash
   npm run db:generate
   ```
4. If schema changes aren't being picked up, try:
   ```bash
   npx prisma migrate dev --name reset --create-only
   ```

### Authentication Issues

If you encounter authentication issues:

1. Verify your Google OAuth credentials
2. Check the `NEXTAUTH_URL` and `NEXTAUTH_SECRET` in your `.env` file
3. Ensure your authorized redirect URIs are correctly configured in Google Cloud Console
4. Check the browser console for any errors

### Component Rendering Issues

If components aren't rendering correctly:

1. Check for TypeScript errors
2. Verify that you're passing all required props
3. Check for React hook rule violations
4. Use React Developer Tools to inspect the component tree

### API Route Issues

If API routes aren't working correctly:

1. Check the Network tab in browser developer tools
2. Verify the request payload
3. Check for authentication/authorization issues
4. Look for error messages in the console

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NextAuth.js Documentation](https://next-auth.js.org/getting-started/introduction)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Radix UI Documentation](https://www.radix-ui.com/docs/primitives)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)
