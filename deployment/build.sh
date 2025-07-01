#!/usr/bin/env bash
# exit on error
set -o errexit

# Install dependencies
npm ci

# Generate Prisma client
npx prisma generate

# Build the application
npm run build

# Run database migrations
npx prisma migrate deploy