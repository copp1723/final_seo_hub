# Developer Setup Guide

## Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- Git
- A Google Cloud account (for OAuth and GA4)

## Quick Start

### 1. Clone and Install

```bash
git clone git@github.com:copp1723/final_seo_hub.git
cd final_seo_hub
npm install
```

### 2. Database Setup

```bash
# Create database
createdb rylie_seo_hub_dev

# Copy environment file
cp .env.example .env

# Update DATABASE_URL in .env
DATABASE_URL=postgresql://postgres:password@localhost/rylie_seo_hub_dev

# Run migrations
npx prisma generate
npx prisma db push
```

### 3. Environment Configuration

Generate secure keys:
```bash
npm run generate-keys
```

Copy the generated keys to your `.env` file.

### 4. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3001/api/auth/callback/google`
5. Copy Client ID and Secret to `.env`

### 5. Start Development Server

```bash
npm run dev
```

Visit http://localhost:3001

## Setting Up GA4 Integration (Optional)

### 1. Create Service Account

1. In Google Cloud Console, go to "Service Accounts"
2. Create a new service account
3. Download JSON key file
4. Extract the email address from the JSON
5. Add to `.env` as `GA4_SERVICE_ACCOUNT_EMAIL`

### 2. Grant GA4 Access

1. Go to Google Analytics
2. Admin → Property Access Management
3. Add the service account email with "Viewer" role

## Common Development Tasks

### Run Tests
```bash
npm test                 # Run all tests
npm run test:watch      # Watch mode
```

### Database Commands
```bash
npx prisma studio       # Open database GUI
npx prisma db push     # Push schema changes
npx prisma generate    # Regenerate client
```

### Type Checking
```bash
npm run type-check     # Check TypeScript types
```

### Build for Production
```bash
npm run build
npm start
```

## Project Structure

```
final_seo_hub/
├── app/                # Next.js App Router pages
│   ├── api/           # API routes
│   ├── dashboard/     # Dashboard page
│   ├── requests/      # Requests pages
│   └── ...
├── components/        # React components
│   ├── ui/           # Base UI components
│   └── ...
├── lib/              # Utilities and services
│   ├── validations/  # Zod schemas
│   └── ...
├── prisma/           # Database schema
└── public/           # Static assets
```

## Working on Tickets

### 1. Create Feature Branch
```bash
git checkout -b ticket-001-navigation
```

### 2. Make Changes
Follow the acceptance criteria in the ticket.

### 3. Test Your Changes
- Test on desktop and mobile
- Check error states
- Verify with different data

### 4. Submit PR
```bash
git add .
git commit -m "TICKET-001: Add main navigation component"
git push origin ticket-001-navigation
```

Include in PR description:
- Ticket number and title
- Screenshots (for UI changes)
- Testing steps
- Any questions or concerns

## Troubleshooting

### "ENCRYPTION_KEY environment variable is required"
Run `npm run generate-keys` and add to `.env`

### Database connection errors
- Check PostgreSQL is running
- Verify DATABASE_URL is correct
- Try `createdb` command if database doesn't exist

### OAuth redirect errors
- Ensure redirect URI in Google Console matches exactly
- Check NEXTAUTH_URL in `.env`

### Build errors
```bash
rm -rf .next node_modules
npm install
npm run build
```

## Useful Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [NextAuth Documentation](https://next-auth.js.org)
- [Tailwind CSS](https://tailwindcss.com)

## Getting Help

- Check existing tickets and PRs
- Ask in team chat
- Review similar implementations in codebase
- Check the docs/ folder for guides