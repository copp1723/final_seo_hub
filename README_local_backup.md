# Rylie SEO Hub

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-15.3.4-black)
![React](https://img.shields.io/badge/React-19.0.0-blue)
![License](https://img.shields.io/badge/license-Proprietary-red)

AI-Powered SEO Request Management Platform for automotive dealerships, built with Next.js 15, PostgreSQL, and AI integration.

## 📋 Overview

Rylie SEO Hub enables automotive dealerships to manage SEO tasks and integrate with external SEO service providers. The platform provides a comprehensive suite of tools for SEO request management, analytics integration, and AI-assisted content planning.

### Key Features

- **Multi-tenant Architecture**: Support for agencies and independent dealerships
- **Package Management**: Silver, Gold, and Platinum packages with usage tracking
- **SEOWorks Integration**: Seamless integration with SEO service providers
- **AI-Powered Chat**: Context-aware SEO assistance
- **Analytics Dashboard**: Google Analytics 4 and Search Console integration
- **White-Label Branding**: Customizable branding for different agencies

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm 8.x or higher
- PostgreSQL 14.x or higher
- Redis (optional, for enhanced rate limiting)

### Installation

1. Clone the repository
   ```bash
   git clone [repository-url]
   cd final_seo_hub
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Set up environment variables
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Set up the database
   ```bash
   npm run db:migrate:dev
   ```

5. Start the development server
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🏗️ System Architecture

### Data Layer
- PostgreSQL
- Prisma ORM
- Redis Cache

### External Integrations
- SEOWorks API
- Google Analytics 4
- Search Console
- OpenAI/OpenRouter
- Mailgun

### Business Logic
- Request Management
- Package Tracking
- SEO Analytics
- AI Chat System

### API Layer
- API Routes
- Middleware
- Rate Limiting

### Frontend Layer
- Next.js App Router
- React Components
- Tailwind UI

## 📚 Documentation

Explore the complete documentation in the [docs/](./docs/) directory:

- [API Documentation](./docs/API_DOCUMENTATION.md)
- [Deployment Guide](./docs/DEPLOYMENT_GUIDE.md)
- [Developer Setup](./docs/DEVELOPER_SETUP.md)
- [SEOWorks Integration](./docs/SEOWORKS_INTEGRATION.md)
- [Database Management](./docs/DATABASE_MANAGEMENT.md)
- [White-Label Branding](./docs/WHITE_LABEL_BRANDING.md)
- [Authentication Guide](./docs/AUTHENTICATION_GUIDE.md)

## 🧪 Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific tests
npm run test:redis
```

## 🚢 Deployment

For detailed deployment instructions, see the [Deployment Guide](./docs/DEPLOYMENT_GUIDE.md).

Quick deployment with Render:

1. Set up your Render account
2. Connect your repository
3. Configure environment variables
4. Deploy using the build command: `npm install && npm run build:production`

## 🧰 Scripts

- `npm run dev`: Start development server
- `npm run build`: Build the application
- `npm run start`: Start production server
- `npm run lint`: Run ESLint
- `npm run type-check`: Check TypeScript types
- `npm run db:migrate`: Run database migrations
- `npm run db:studio`: Open Prisma Studio

## 🔒 Security Features

- OAuth 2.0 with Google-based authentication
- Role-based access control
- API rate limiting
- Content Security Policy
- CSRF protection

## 🌐 Multi-Tenant Architecture

The platform supports two main deployment models:

1. **Agency Model**: Agencies manage multiple dealerships
2. **Independent Model**: Dealerships operate without agency affiliation

Both models have full access to all platform features with proper data isolation.

## 📊 License

Proprietary - All rights reserved
