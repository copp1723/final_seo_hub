import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

// EMERGENCY DATABASE SETUP ENDPOINT - REMOVE AFTER USE
export async function POST() {
  try {
    console.log('🔄 Starting database setup...')
    
    // Create a new Prisma client instance
    const prisma = new PrismaClient()
    
    // Execute raw SQL to create the schema based on Prisma schema
    console.log('📦 Creating User table...')
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "email" TEXT NOT NULL UNIQUE,
        "emailVerified" TIMESTAMP,
        "name" TEXT,
        "image" TEXT,
        "role" TEXT NOT NULL DEFAULT 'USER',
        "agencyId" TEXT,
        "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
        "activePackageType" TEXT,
        "currentBillingPeriodStart" TIMESTAMP,
        "currentBillingPeriodEnd" TIMESTAMP,
        "pagesUsedThisPeriod" INTEGER NOT NULL DEFAULT 0,
        "blogsUsedThisPeriod" INTEGER NOT NULL DEFAULT 0,
        "gbpPostsUsedThisPeriod" INTEGER NOT NULL DEFAULT 0,
        "improvementsUsedThisPeriod" INTEGER NOT NULL DEFAULT 0,
        "apiKey" TEXT UNIQUE,
        "apiKeyCreatedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `
    
    console.log('🔑 Creating Account table...')
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Account" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "provider" TEXT NOT NULL,
        "providerAccountId" TEXT NOT NULL,
        "refresh_token" TEXT,
        "access_token" TEXT,
        "expires_at" INTEGER,
        "token_type" TEXT,
        "scope" TEXT,
        "id_token" TEXT,
        "session_state" TEXT,
        UNIQUE("provider", "providerAccountId")
      )
    `
    
    console.log('🎫 Creating Session table...')
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Session" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "sessionToken" TEXT NOT NULL UNIQUE,
        "userId" TEXT NOT NULL,
        "expires" TIMESTAMP NOT NULL
      )
    `
    
    console.log('🏢 Creating Agency table...')
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Agency" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "domain" TEXT UNIQUE,
        "settings" JSONB NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `
    
    console.log('📋 Creating Request table...')
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Request" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "agencyId" TEXT,
        "title" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "packageType" TEXT,
        "pagesCompleted" INTEGER NOT NULL DEFAULT 0,
        "blogsCompleted" INTEGER NOT NULL DEFAULT 0,
        "gbpPostsCompleted" INTEGER NOT NULL DEFAULT 0,
        "improvementsCompleted" INTEGER NOT NULL DEFAULT 0,
        "keywords" JSONB,
        "targetUrl" TEXT,
        "targetCities" JSONB,
        "targetModels" JSONB,
        "completedTasks" JSONB,
        "contentUrl" TEXT,
        "pageTitle" TEXT,
        "completedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `
    
    console.log('📊 Creating additional tables...')
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "GA4Connection" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL UNIQUE,
        "accessToken" TEXT NOT NULL,
        "refreshToken" TEXT,
        "expiresAt" TIMESTAMP,
        "propertyId" TEXT,
        "propertyName" TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "SearchConsoleConnection" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL UNIQUE,
        "accessToken" TEXT NOT NULL,
        "refreshToken" TEXT,
        "expiresAt" TIMESTAMP,
        "siteUrl" TEXT,
        "siteName" TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "UserPreferences" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL UNIQUE,
        "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
        "requestCreated" BOOLEAN NOT NULL DEFAULT true,
        "statusChanged" BOOLEAN NOT NULL DEFAULT true,
        "taskCompleted" BOOLEAN NOT NULL DEFAULT true,
        "weeklySummary" BOOLEAN NOT NULL DEFAULT true,
        "marketingEmails" BOOLEAN NOT NULL DEFAULT false,
        "timezone" TEXT DEFAULT 'America/New_York',
        "language" TEXT DEFAULT 'en',
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "MonthlyUsage" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "month" INTEGER NOT NULL,
        "year" INTEGER NOT NULL,
        "packageType" TEXT NOT NULL,
        "pagesUsed" INTEGER NOT NULL,
        "blogsUsed" INTEGER NOT NULL,
        "gbpPostsUsed" INTEGER NOT NULL,
        "improvementsUsed" INTEGER NOT NULL,
        "archivedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("userId", "month", "year")
      )
    `
    
    // Test if the setup worked
    const userCount = await prisma.user.count()
    
    await prisma.$disconnect()
    
    console.log('✅ Database setup complete!')
    
    return NextResponse.json({
      success: true,
      message: 'Database tables created successfully',
      userCount,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Database setup error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
} 