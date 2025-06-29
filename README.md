# Rylie SEO Hub

AI-Powered SEO Request Management Platform

## Features

- 🔐 **Secure Authentication** - Google OAuth with NextAuth
- 📊 **Request Management** - Track SEO requests with package-based progress
- 🤖 **AI Chat Assistant** - Get SEO insights and recommendations
- 📈 **Analytics Integration** - GA4 and Search Console data
- 🏢 **Multi-tenant** - Support for multiple agencies

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js v5
- **Styling**: Tailwind CSS
- **Deployment**: Render

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Google OAuth credentials

### Installation

1. Clone the repository:
```bash
git clone git@github.com:copp1723/final_seo_hub.git
cd final_seo_hub
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your values
```

4. Set up the database:
```bash
npx prisma generate
npx prisma db push
```

5. Run the development server:
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Project Structure

```
├── app/              # Next.js app router pages
├── components/       # React components
├── lib/             # Utility functions and configurations
├── prisma/          # Database schema and migrations
├── types/           # TypeScript type definitions
├── hooks/           # Custom React hooks
└── constants/       # Application constants
```

## Development

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Check TypeScript
```

## Contributing

See [DEVELOPER_TICKETS.md](./DEVELOPER_TICKETS.md) for available tasks.

## License

MIT