# Integration Test Suite

## Overview

This comprehensive integration test suite validates the encryption fixes and dealership data isolation functionality implemented in the SEO Hub platform. The test suite ensures that both the OAuth token encryption and dealership switching systems work correctly together.

## What It Tests

### 🔐 Encryption System
- **Encryption Key Validation**: Checks that `ENCRYPTION_KEY` and `GA4_TOKEN_ENCRYPTION_KEY` are properly configured
- **Key Security**: Validates keys are not using weak patterns or insufficient entropy
- **Encryption/Decryption**: Tests full encryption/decryption cycle with various data types
- **OAuth Token Storage**: Validates encrypted storage and retrieval of Google OAuth tokens

### 🏢 Dealership Data Isolation
- **Database Relationships**: Verifies proper relationships between users, dealerships, and agencies
- **Access Control**: Ensures users can only access data for authorized dealerships
- **Dealership Switching**: Tests the ability to switch between dealerships and see different data
- **Cross-Dealership Protection**: Validates that users cannot access unauthorized dealership data

### 🌐 API Integration
- **Authentication Requirements**: Ensures API endpoints require proper authentication
- **Dealership Parameters**: Tests APIs with dealership-specific parameters
- **Error Handling**: Validates proper error responses for invalid requests
- **Data Filtering**: Confirms APIs return only authorized dealership data

### 🔒 Security & Access Control
- **OAuth Flow Protection**: Tests that OAuth tokens are properly encrypted in storage
- **Session Management**: Validates session-based access control
- **Agency-Level Access**: Tests multi-dealership access for agency users
- **Error Scenarios**: Tests handling of invalid dealerships, expired tokens, etc.

## Running the Tests

### Prerequisites

1. **Environment Setup**: Ensure your `.env` file contains:
   ```bash
   DATABASE_URL="your-database-connection-string"
   ENCRYPTION_KEY="your-64-character-encryption-key"
   GA4_TOKEN_ENCRYPTION_KEY="your-64-character-ga4-key"
   NEXTAUTH_SECRET="your-nextauth-secret"
   NEXTAUTH_URL="http://localhost:3000"
   ```

2. **Database Access**: The test requires a working database connection
3. **Dependencies**: Run `npm install` to ensure all dependencies are available

### Running the Test Suite

```bash
# Basic test run
npm run test:integration

# Verbose output with debugging
npm run test:integration:verbose

# Direct execution
node scripts/integration-test.js
```

### Expected Output

The test will output:
- ✅ **Passed tests**: Features working correctly
- ❌ **Failed tests**: Issues that need immediate attention
- ⚠️ **Warnings**: Potential issues or configuration problems
- 📊 **Summary report**: Overall system health and recommendations

## Test Results Interpretation

### Success Rate Guidelines
- **90%+ Success**: System is ready for production use
- **75-89% Success**: System is functional but has issues to address
- **<75% Success**: System requires significant fixes before deployment

### Common Issues and Solutions

#### 🔑 Encryption Key Issues
**Problem**: Tests fail with "weak encryption key" errors
**Solution**: 
```bash
# Generate new secure keys
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('GA4_TOKEN_ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
```

#### 💾 Database Connection Issues
**Problem**: Tests fail with database connection errors
**Solution**: 
- Verify `DATABASE_URL` is correct
- Ensure database is running and accessible
- Check firewall settings

#### 🔐 OAuth Token Decryption Issues
**Problem**: Tests fail when trying to decrypt stored tokens
**Solution**: 
- Existing OAuth connections may use old encryption keys
- Users will need to reconnect their Google accounts
- Consider running a migration script to re-encrypt tokens

#### 🏢 Dealership Access Issues
**Problem**: Users can see wrong dealership data
**Solution**: 
- Check user-dealership relationships in database
- Verify dealership switching API is working
- Ensure frontend is sending correct dealership parameters

## Manual Testing Instructions

After the automated tests pass, perform these manual tests:

### 1. Authentication Flow
```
1. Open browser to your application
2. Try accessing /dashboard (should redirect to login)
3. Login with valid credentials
4. Verify access to dashboard
```

### 2. Dealership Switching
```
1. Login as user with multiple dealership access
2. Use dealership selector dropdown
3. Switch between dealerships
4. Verify dashboard data changes
5. Check URL parameters update correctly
```

### 3. OAuth Integration
```
1. Go to Settings → GA4 Integration
2. Connect Google Analytics account
3. Verify OAuth flow completes
4. Check real data appears in dashboard
5. Test Search Console integration
```

### 4. Data Isolation
```
1. Create test users for different dealerships
2. Login as User A, note analytics data
3. Login as User B, verify different data shown
4. Try URL manipulation to access other dealership data
5. Should be blocked with appropriate errors
```

### 5. API Security
```
1. Test API endpoints without authentication:
   - GET /api/dashboard/analytics
   - GET /api/dealerships/switch
2. Should return 401 Unauthorized
3. Test with invalid dealership IDs
4. Should return appropriate error messages
```

## Test Data Management

### Automatic Cleanup
The test suite automatically:
- Creates temporary test data (users, dealerships, agencies)
- Creates test OAuth connections with encrypted tokens
- Cleans up all test data after completion

### Manual Cleanup (if needed)
If tests are interrupted, you may need to manually clean up:

```sql
-- Remove test users
DELETE FROM users WHERE email LIKE '%@test.com';

-- Remove test dealerships
DELETE FROM dealerships WHERE name LIKE 'Test Dealership%';

-- Remove test agencies
DELETE FROM agencies WHERE name LIKE 'Test Agency%';

-- Remove test GA4 connections
DELETE FROM ga4_connections WHERE id LIKE 'test-ga4-%';

-- Remove test Search Console connections
DELETE FROM search_console_connections WHERE id LIKE 'test-sc-%';
```

## Troubleshooting

### Test Fails with "Database connection failed"
- Check your `DATABASE_URL` environment variable
- Ensure the database server is running
- Verify network connectivity to database

### Test Fails with "ENCRYPTION_KEY environment variable is required"
- Add `ENCRYPTION_KEY` to your `.env` file
- Use the key generation commands shown above
- Restart your application after updating environment variables

### Test Fails with "Access token is null or undefined"
- This indicates OAuth tokens are not properly encrypted/stored
- Users may need to reconnect their Google accounts
- Check that `GA4_TOKEN_ENCRYPTION_KEY` is set correctly

### Tests Pass but Manual Testing Shows Issues
- Clear browser cache and cookies
- Check browser developer console for JavaScript errors
- Verify environment variables are loaded correctly in production
- Check server logs for additional error details

## Integration with CI/CD

To include this test in your CI/CD pipeline:

```yaml
# Example GitHub Actions step
- name: Run Integration Tests
  run: |
    npm install
    npm run db:generate
    npm run test:integration
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    ENCRYPTION_KEY: ${{ secrets.ENCRYPTION_KEY }}
    GA4_TOKEN_ENCRYPTION_KEY: ${{ secrets.GA4_TOKEN_ENCRYPTION_KEY }}
    NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}
```

## Security Considerations

- **Test Data**: All test data is temporary and uses fake credentials
- **Production Safety**: Tests include safeguards against running in production environments
- **Key Validation**: Tests ensure encryption keys meet security requirements
- **Access Control**: Tests verify proper authorization and data isolation

## Support

If you encounter issues with the integration tests:

1. **Check Environment**: Verify all required environment variables are set
2. **Review Logs**: Check the detailed test output for specific error messages
3. **Manual Verification**: Use the manual testing instructions to isolate issues
4. **Database State**: Ensure database schema is up to date with `npm run db:generate`

For additional support, refer to the main project documentation or contact the development team.