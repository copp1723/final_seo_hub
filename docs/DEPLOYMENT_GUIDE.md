# Deployment Guide

This guide provides detailed instructions for deploying the Rylie SEO Hub platform to various environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Deployment Options](#deployment-options)
  - [Render.com Deployment](#rendercom-deployment)
  - [Custom Server Deployment](#custom-server-deployment)
  - [Docker Deployment](#docker-deployment)
- [Database Setup](#database-setup)
- [Redis Configuration](#redis-configuration)
- [SMTP Configuration](#smtp-configuration)
- [Google OAuth Setup](#google-oauth-setup)
- [SEOWorks Integration](#seoworks-integration)
- [Post-Deployment Tasks](#post-deployment-tasks)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying the Rylie SEO Hub platform, ensure you have:

- Node.js 18.x or higher
- npm 8.x or higher
- PostgreSQL 14.x or higher
- Redis (optional, but recommended for production)
- A domain name with DNS configuration
- SSL certificate (Let's Encrypt or similar)
- Google Developer account (for OAuth and API access)
- SEOWorks API credentials (if using SEOWorks integration)
- Mailgun account (for email notifications)

## Environment Variables

Create a `.env` file based on the `.env.example` template. Below are the key environment variables required:

```bash
# Core Configuration
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://username:password@hostname:port/database
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-random-secret-key

# Redis (optional but recommended)
REDIS_URL=redis://username:password@hostname:port

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# Google Analytics & Search Console API
GOOGLE_API_KEY=your-api-key

# Email (Mailgun)
MAILGUN_API_KEY=your-mailgun-api-key
MAILGUN_DOMAIN=your-mailgun-domain
EMAIL_FROM=noreply@your-domain.com

# OpenAI API (for AI chat)
OPENAI_API_KEY=your-openai-api-key

# OpenRouter API (alternative AI provider)
OPENROUTER_API_KEY=your-openrouter-api-key

# SEOWorks Integration
SEOWORKS_API_KEY=your-seoworks-api-key
SEOWORKS_WEBHOOK_SECRET=your-webhook-secret

# Error Tracking (optional)
SENTRY_DSN=your-sentry-dsn
```

## Deployment Options

### Render.com Deployment

Render.com is the recommended deployment platform due to its simplicity and built-in support for PostgreSQL.

#### Step 1: Create a Render Account

Sign up at [render.com](https://render.com) if you don't already have an account.

#### Step 2: Create a PostgreSQL Database

1. In the Render dashboard, click "New" and select "PostgreSQL"
2. Configure your database:
   - Name: `rylie-seo-hub-db`
   - Database: `rylie_seo_hub`
   - User: `rylie_admin` (or your preferred username)
   - Region: Choose the closest to your users
3. Click "Create Database"
4. Note the connection details provided

#### Step 3: Create a Redis Instance (Optional)

1. In the Render dashboard, click "New" and select "Redis"
2. Configure your Redis instance:
   - Name: `rylie-seo-hub-redis`
   - Region: Same as your database
3. Click "Create Redis"
4. Note the connection URL provided

#### Step 4: Create a Web Service

1. In the Render dashboard, click "New" and select "Web Service"
2. Connect your GitHub repository
3. Configure the service:
   - Name: `rylie-seo-hub`
   - Environment: `Node`
   - Region: Same as your database
   - Branch: `main` (or your deployment branch)
   - Build Command: `npm install && npm run build:production`
   - Start Command: `npm run start`
4. Under "Advanced", add all required environment variables from the `.env.example` file
5. Click "Create Web Service"

#### Step 5: Configure Custom Domain

1. In your web service settings, go to the "Settings" tab
2. Under "Custom Domain", click "Add Custom Domain"
3. Enter your domain name and follow the instructions to verify ownership
4. Render will automatically provision an SSL certificate via Let's Encrypt

### Custom Server Deployment

For deployment to your own server or VPS:

#### Step 1: Prepare the Server

```bash
# Update the system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Redis (optional)
sudo apt install -y redis-server

# Install Nginx
sudo apt install -y nginx

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx
```

#### Step 2: Configure PostgreSQL

```bash
# Access PostgreSQL
sudo -u postgres psql

# Create database and user
CREATE DATABASE rylie_seo_hub;
CREATE USER rylie_admin WITH PASSWORD 'your-password';
GRANT ALL PRIVILEGES ON DATABASE rylie_seo_hub TO rylie_admin;
\q

# Test connection
psql -h localhost -U rylie_admin -d rylie_seo_hub
```

#### Step 3: Configure Nginx

Create an Nginx configuration file:

```bash
sudo nano /etc/nginx/sites-available/rylie-seo-hub
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site and get SSL certificate:

```bash
sudo ln -s /etc/nginx/sites-available/rylie-seo-hub /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com
```

#### Step 4: Deploy the Application

```bash
# Create application directory
mkdir -p /var/www/rylie-seo-hub
cd /var/www/rylie-seo-hub

# Clone the repository
git clone https://github.com/your-username/final_seo_hub.git .

# Install dependencies
npm install

# Create .env file
cp .env.example .env
nano .env  # Edit environment variables

# Build the application
npm run build:production

# Set up systemd service
sudo nano /etc/systemd/system/rylie-seo-hub.service
```

Add the following service configuration:

```ini
[Unit]
Description=Rylie SEO Hub
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/rylie-seo-hub
ExecStart=/usr/bin/npm run start
Restart=on-failure
Environment=PORT=3000
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Start the service:

```bash
sudo systemctl enable rylie-seo-hub
sudo systemctl start rylie-seo-hub
sudo systemctl status rylie-seo-hub
```

### Docker Deployment

For Docker-based deployment:

#### Step 1: Create a Dockerfile

Create a Dockerfile in the project root:

```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

#### Step 2: Create Docker Compose File

Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    restart: always
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
    environment:
      - DATABASE_URL=postgresql://rylie_admin:your-password@postgres:5432/rylie_seo_hub
      - REDIS_URL=redis://redis:6379
      - NEXTAUTH_URL=https://your-domain.com
      - NEXTAUTH_SECRET=your-random-secret-key
      # Add all other environment variables here

  postgres:
    image: postgres:14
    restart: always
    environment:
      - POSTGRES_USER=rylie_admin
      - POSTGRES_PASSWORD=your-password
      - POSTGRES_DB=rylie_seo_hub
    volumes:
      - postgres-data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7
    restart: always
    volumes:
      - redis-data:/data
    ports:
      - "6379:6379"

volumes:
  postgres-data:
  redis-data:
```

#### Step 3: Deploy with Docker Compose

```bash
# Build and start the containers
docker-compose up -d

# Run migrations
docker-compose exec app npx prisma migrate deploy

# Check logs
docker-compose logs -f app
```

## Database Setup

After deploying the application, you need to set up the database:

```bash
# Run migrations
npm run db:migrate

# Create initial admin users (optional)
npm run db:setup-admins
```

## Redis Configuration

Redis is used for rate limiting, CSRF protection, and session storage. For production, it's recommended to configure Redis with persistence:

```bash
# Edit Redis configuration
sudo nano /etc/redis/redis.conf

# Set persistence mode (AOF)
appendonly yes

# Restart Redis
sudo systemctl restart redis
```

## SMTP Configuration

Email notifications use Mailgun. Ensure your Mailgun domain is properly set up and verified:

1. Create a Mailgun account at [mailgun.com](https://www.mailgun.com/)
2. Add and verify your domain
3. Create an API key
4. Update your environment variables with the Mailgun API key and domain

## Google OAuth Setup

To set up Google OAuth for authentication:

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Navigate to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth client ID"
5. Select "Web application"
6. Add your domain to "Authorized JavaScript origins"
7. Add `https://your-domain.com/api/auth/callback/google` to "Authorized redirect URIs"
8. Save and note the Client ID and Client Secret
9. Update your environment variables with the Google Client ID and Client Secret

## SEOWorks Integration

To set up SEOWorks integration:

1. Obtain API credentials from SEOWorks
2. Update your environment variables with the SEOWorks API key
3. Configure the webhook endpoint in SEOWorks to point to `https://your-domain.com/api/seoworks/webhook`
4. Generate a webhook secret and add it to both SEOWorks configuration and your environment variables

## Post-Deployment Tasks

After deploying the application, perform these additional tasks:

1. **Create Super Admin Users**:
   ```bash
   npm run db:setup-admins
   ```

2. **Verify External Integrations**:
   - Test Google OAuth login
   - Test GA4 and Search Console connections
   - Test SEOWorks webhook integration
   - Test email notifications

3. **Set Up Cron Jobs**:
   - Usage reset job: `0 0 1 * * curl https://your-domain.com/api/cron/reset-usage?key=your-cron-key`
   - Weekly summary emails: `0 9 * * 1 curl https://your-domain.com/api/cron/weekly-summary?key=your-cron-key`

## Monitoring & Maintenance

### Health Checks

Implement a monitoring system to regularly check the application health endpoint:
`https://your-domain.com/api/health`

### Database Backups

Set up regular database backups:

```bash
# Create a backup script
nano /usr/local/bin/backup-db.sh
```

Add the following content:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/rylie-seo-hub"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p $BACKUP_DIR
pg_dump -U rylie_admin -d rylie_seo_hub | gzip > "$BACKUP_DIR/rylie_seo_hub_$TIMESTAMP.sql.gz"
find $BACKUP_DIR -type f -mtime +7 -delete
```

Make the script executable and create a cron job:

```bash
chmod +x /usr/local/bin/backup-db.sh
crontab -e
```

Add the following line to run daily backups:

```
0 2 * * * /usr/local/bin/backup-db.sh
```

### Log Rotation

Configure log rotation to prevent log files from growing too large:

```bash
sudo nano /etc/logrotate.d/rylie-seo-hub
```

Add the following configuration:

```
/var/www/rylie-seo-hub/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data adm
    sharedscripts
    postrotate
        systemctl reload rylie-seo-hub
    endscript
}
```

## Troubleshooting

### Database Connection Issues

If you encounter database connection issues:

1. Verify the `DATABASE_URL` environment variable is correct
2. Check that the database server is running
3. Ensure firewall rules allow connections
4. Test the connection manually:
   ```bash
   psql "postgresql://username:password@hostname:port/database"
   ```

### Build Errors

If you encounter build errors:

1. Clear the Next.js cache:
   ```bash
   rm -rf .next
   ```
2. Update dependencies:
   ```bash
   npm update
   ```
3. Check Node.js version:
   ```bash
   node -v
   ```
4. Ensure all required environment variables are set

### Authentication Issues

If users cannot sign in:

1. Verify Google OAuth credentials
2. Check that the `NEXTAUTH_URL` matches your domain exactly
3. Ensure the redirect URI is correctly configured in Google Cloud Console
4. Check for CORS issues in browser developer tools

### Email Delivery Problems

If emails are not being sent:

1. Verify Mailgun API key and domain
2. Check Mailgun logs for delivery issues
3. Test email delivery manually:
   ```bash
   curl -s --user "api:YOUR_API_KEY" \
     https://api.mailgun.net/v3/YOUR_DOMAIN/messages \
     -F from="Test User <mailgun@YOUR_DOMAIN>" \
     -F to=recipient@example.com \
     -F subject="Hello" \
     -F text="Testing Mailgun"
   ```

### Performance Issues

If you encounter performance problems:

1. Check database indexing
2. Verify Redis is properly configured
3. Monitor server resources (CPU, memory, disk I/O)
4. Consider scaling up your server resources
5. Implement additional caching strategies

For more detailed troubleshooting, refer to the logs:

```bash
# View application logs
sudo journalctl -u rylie-seo-hub

# View Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# View database logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```
