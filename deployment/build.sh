#!/usr/bin/env bash
# exit on error
set -o errexit

echo "🚀 Starting build process..."

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Generate Prisma client
echo "🔄 Generating Prisma client..."
npx prisma generate

# Set up database schema (creates tables if they don't exist)
echo "🗃️ Setting up database tables..."
npx prisma db push --accept-data-loss

# Build the application
echo "🔨 Building Next.js application..."
npm run build

echo "✅ Build process complete!"