#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const { google } = require('googleapis');

const prisma = new PrismaClient();

// Simple decrypt function (assuming no encryption for test)
function decrypt(encryptedData) {
  // For testing, assume data might not be encrypted
  return encryptedData;
}

async function testWorkingGA4() {
  try {
    console.log('🧪 Testing Working GA4 Connection');
    console.log('=================================\n');

    // Find the working connection
    const workingConnection = await prisma.ga4_connections.findFirst({
      where: {
        // accessToken is required (not nullable), so just check it's not empty
        accessToken: { not: "" },
        // refreshToken is nullable, so check it's not null
        refreshToken: { not: null }
      },
      include: {
        users: { select: { email: true } }
      }
    });    if (!workingConnection) {
      console.log('❌ No working GA4 connection found');
      return;
    }

    console.log(`✅ Found working connection for ${workingConnection.users.email}`);
    console.log(`   Property: ${workingConnection.propertyName} (${workingConnection.propertyId})`);
    console.log(`   Expires: ${workingConnection.expiresAt}`);
    console.log(`   Has Access Token: ${!!workingConnection.accessToken}`);
    console.log(`   Has Refresh Token: ${!!workingConnection.refreshToken}`);

    // Check if token is expired
    const isExpired = workingConnection.expiresAt && new Date() > workingConnection.expiresAt;
    console.log(`   Token Status: ${isExpired ? 'EXPIRED' : 'VALID'}`);

    if (isExpired) {
      console.log('⚠️  Token is expired, testing refresh mechanism...');

      // Test token refresh
      try {
        console.log('🔄 Attempting to refresh token...');

        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          process.env.NEXTAUTH_URL + '/api/ga4/auth/callback'
        );

        oauth2Client.setCredentials({
          refresh_token: decrypt(workingConnection.refreshToken)
        });

        const { credentials } = await oauth2Client.refreshAccessToken();

        if (credentials.access_token) {
          console.log('✅ Token refresh successful!');
          console.log(`   New access token received (length: ${credentials.access_token.length})`);
          console.log(`   New expiry: ${credentials.expiry_date ? new Date(credentials.expiry_date) : 'Not provided'}`);

          // Test the new token with a simple API call
          oauth2Client.setCredentials({
            access_token: credentials.access_token,
            refresh_token: decrypt(workingConnection.refreshToken)
          });

          const analyticsData = google.analyticsdata({
            version: 'v1beta',
            auth: oauth2Client
          });

          console.log('🧪 Testing new token with API call...');
          const response = await analyticsData.properties.batchRunReports({
            property: `properties/${workingConnection.propertyId}`,
            requestBody: {
              requests: [{
                dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
                metrics: [{ name: 'sessions' }],
                dimensions: [{ name: 'date' }],
                limit: 5
              }]
            }
          });

          console.log('✅ API call with refreshed token successful!');
          console.log(`   Reports received: ${response.data.reports?.length || 0}`);
          console.log(`   First report rows: ${response.data.reports?.[0]?.rowCount || 0}`);

        } else {
          console.log('❌ Token refresh failed - no access token received');
        }

      } catch (refreshError) {
        console.log('❌ Token refresh failed:', refreshError.message);
        if (refreshError.message.includes('invalid_grant')) {
          console.log('   This usually means the refresh token is expired or invalid');
        }
      }

      return;
    }

    // Try to use the tokens
    console.log('\n🔄 Testing Google Analytics API...');
    
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/ga4/auth/callback`
    );

    // Set credentials (assuming tokens are encrypted)
    try {
      const accessToken = decrypt(workingConnection.accessToken);
      const refreshToken = decrypt(workingConnection.refreshToken);
      
      oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      const analyticsData = google.analyticsdata({
        version: 'v1beta',
        auth: oauth2Client
      });

      console.log('✅ OAuth client configured');

      // Test API call
      const response = await analyticsData.properties.runReport({
        property: `properties/${workingConnection.propertyId}`,
        requestBody: {
          dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
          metrics: [
            { name: 'sessions' },
            { name: 'totalUsers' },
            { name: 'eventCount' }
          ],
          dimensions: [],
          limit: 1
        }
      });

      if (response.data && response.data.rows && response.data.rows.length > 0) {
        const row = response.data.rows[0];
        console.log('✅ GA4 API call successful:');
        console.log(`   Sessions: ${row.metricValues[0]?.value || 0}`);
        console.log(`   Users: ${row.metricValues[1]?.value || 0}`);
        console.log(`   Events: ${row.metricValues[2]?.value || 0}`);
        
        console.log('\n🎯 SOLUTION FOUND:');
        console.log('   The GA4 API is working with valid tokens!');
        console.log('   The issue is that other connections lack proper OAuth tokens.');
        
      } else {
        console.log('⚠️  API call succeeded but no data returned');
      }

    } catch (apiError) {
      console.error('❌ API call failed:', apiError.message);
      
      if (apiError.message.includes('invalid_grant') || apiError.message.includes('Token has been expired')) {
        console.log('🔄 Token needs refresh');
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testWorkingGA4();