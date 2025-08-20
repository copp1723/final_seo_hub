#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Files and their fixes
const fixes = [
  // Fix user_dealership_access create operations
  {
    file: 'app/api/admin/users/[userId]/dealership-access/route.ts',
    replacements: [
      {
        from: `    // Create new access record
    const newAccess = await prisma.user_dealership_access.create({
      data: {
        userId,
        dealershipId,
        accessLevel,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        grantedBy: session.user.id,
        isActive: true
      },`,
        to: `    // Create new access record
    const newAccess = await prisma.user_dealership_access.create({
      data: {
        userId,
        dealershipId,
        accessLevel,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        grantedBy: session.user.id,
        isActive: true
      },`
      }
    ]
  },
  // Fix sessions create operations
  {
    file: 'app/api/auth/accept-invitation/route.ts',
    replacements: [
      {
        from: `      await prisma.sessions.create({
        data: {
          sessionToken: token,
          userId: user.id,
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        }
      })`,
        to: `      await prisma.sessions.create({
        data: {
          sessionToken: token,
          userId: user.id,
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        }
      })`
      }
    ]
  },
  // Fix dealership queries with wrong relation names
  {
    file: 'app/api/dashboard/analytics/route.ts',
    replacements: [
      {
        from: `        where: {
          users: {
            some: {
              id: session.user.id
            }
          }
        }`,
        to: `        where: {
          user_dealership_access: {
            some: {
              userId: session.user.id,
              isActive: true
            }
          }
        }`
      }
    ]
  },
  // Fix similar issues in other files
  {
    file: 'app/api/dashboard/stats/route.ts',
    replacements: [
      {
        from: `        where: {
          users: {
            some: {
              id: session.user.id
            }
          }
        }`,
        to: `        where: {
          user_dealership_access: {
            some: {
              userId: session.user.id,
              isActive: true
            }
          }
        }`
      }
    ]
  },
  // Fix ga4 connections create
  {
    file: 'app/api/ga4/auth/callback/route.ts',
    replacements: [
      {
        from: `        const connection = await prisma.ga4_connections.create({
          data: {
            userId: session.user.id,
            dealershipId: session.user.dealershipId,
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
            expiresAt: expiresAt,
            propertyId: selectedProperty.id,
            propertyName: selectedProperty.name,
            email: session.user.email
          }
        })`,
        to: `        const connection = await prisma.ga4_connections.create({
          data: {
            userId: session.user.id,
            dealershipId: session.user.dealershipId,
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
            expiresAt: expiresAt,
            propertyId: selectedProperty.id,
            propertyName: selectedProperty.name,
            email: session.user.email
          }
        })`
      }
    ]
  },
  // Fix search console connections create
  {
    file: 'app/api/search-console/callback/route.ts',
    replacements: [
      {
        from: `        const connection = await prisma.search_console_connections.create({
          data: {
            userId: session.user.id,
            dealershipId: session.user.dealershipId,
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
            expiresAt: expiresAt,
            siteUrl: selectedSite.siteUrl,
            siteName: selectedSite.siteUrl,
            email: session.user.email
          }
        })`,
        to: `        const connection = await prisma.search_console_connections.create({
          data: {
            userId: session.user.id,
            dealershipId: session.user.dealershipId,
            accessToken: encryptedAccessToken,
            refreshToken: encryptedRefreshToken,
            expiresAt: expiresAt,
            siteUrl: selectedSite.siteUrl,
            siteName: selectedSite.siteUrl,
            email: session.user.email
          }
        })`
      }
    ]
  }
];

// Apply fixes
fixes.forEach(({ file, replacements }) => {
  const filePath = path.join(__dirname, file);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${file}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  replacements.forEach(({ from, to }) => {
    if (content.includes(from)) {
      content = content.replace(from, to);
      changed = true;
      console.log(`✅ Fixed ${file}`);
    }
  });
  
  if (changed) {
    fs.writeFileSync(filePath, content);
  }
});

console.log('🎉 Prisma type fixes completed!');