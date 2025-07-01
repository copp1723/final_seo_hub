# Deployment Guide

## Prerequisites
- Node.js 20.x or higher
- PostgreSQL database
- Redis (optional, for rate limiting)

## Environment Variables
Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

## Render Deployment

### Build Command
```bash
npm install && npm run build && npx prisma generate
```

### Start Command
```bash
npm run start
```

### Environment Variables
Add all required environment variables from `.env.example` to your Render service.

## Database Setup
1. Run migrations:
   ```bash
   npm run db:migrate
   ```

2. Generate Prisma client:
   ```bash
   npm run db:generate
   ```

## Troubleshooting

### Build Errors
If you encounter "Cannot find module" errors during build:
1. Clear Render build cache
2. Ensure all dependencies are in the `dependencies` section of package.json
3. Use `npm install` instead of `npm ci` in the build command

### Node Version
The project uses Node.js 20.x. Make sure your deployment platform uses a compatible version.
EOF < /dev/null