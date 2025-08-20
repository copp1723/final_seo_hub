# CATASTROPHIC REBUILD CHECKLIST

## Summary of Disaster
**Date**: August 19, 2025  
**Cause**: `npx prisma db push --force-reset` executed on production database without backup strategy  
**Result**: Complete loss of all production data  

## What Was Lost (Confirmed from backup analysis)

### 1. Agencies (2 real agencies)
- ✅ **agency-sample-001**: Sample Auto Agency (sample-auto.com)
- ✅ **agency-seoworks**: SEOWORKS (primary production agency)

### 2. Dealerships (20+ real dealerships with working configurations)
- ✅ Jay Hatfield Chevrolet of Columbus (jayhatfieldchevy.net) - GA4: 323480238
- ✅ Jay Hatfield Chevrolet GMC of Chanute (jayhatfieldchanute.com) - GA4: 323404832  
- ✅ Jay Hatfield Chevrolet GMC of Pittsburg (jayhatfieldchevroletgmc.com) - GA4: 371672738
- ✅ Jay Hatfield Chevrolet of Vinita (jayhatfieldchevroletvinita.com) - GA4: 320759942
- ✅ Jay Hatfield CDJR of Frontenac (jayhatfieldchryslerdodgejeepram.com) - GA4: 323415736
- ✅ Sarcoxie Ford (sarcoxieford.com) - GA4: 452793966
- ✅ Jay Hatfield Honda Powerhouse (jayhatfieldhondawichita.com) - GA4: 336729443
- ✅ Jay Hatfield Motorsports of Wichita (kansasmotorsports.com) - GA4: 317592148
- ✅ Jay Hatfield Motorsports of Frontenac (jayhatfieldkawasaki.com) - GA4: 317608467
- ✅ Jay Hatfield Motorsports of Joplin (jhmofjoplin.com) - GA4: 317578343
- ✅ Acura of Columbus (acuracolumbus.com) - GA4: 284944578
- ✅ Genesis of Wichita (genesisofwichita.com) - GA4: 323502411
- ✅ Jay Hatfield Motorsports Portal (jayhatfieldmotorsports.com) - GA4: 461644624
- ✅ Jay Hatfield Motorsports Ottawa (jayhatfieldottawa.com) - GA4: 472110523
- ✅ Hatchett Hyundai East (hatchetthyundaieast.com) - GA4: 323448557
- ✅ Hatchett Hyundai West (hatchetthyundaiwest.com) - GA4: 323465145
- ✅ Premier Mitsubishi (premiermitsubishi.com) - GA4: 473660351
- ✅ Premier Auto Center - Tucson (scottsaysyes.com) - GA4: 470694371
- ✅ Downtown Ford (sample dealership)
- ✅ Westside Toyota (sample dealership)

### 3. Users (4+ real users with proper authentication)
- ✅ Josh Copp (josh.copp@onekeel.ai) - SUPER_ADMIN
- ✅ Agency Admin (admin@sample-auto.com) - AGENCY_ADMIN  
- ✅ Ford Manager (manager@downtownford.com) - DEALERSHIP_ADMIN
- ✅ Toyota Manager (manager@westsidetoyota.com) - DEALERSHIP_ADMIN
- ✅ All dealership managers with working emails

### 4. Critical Infrastructure Lost
- ✅ All GA4 OAuth connections with working access/refresh tokens
- ✅ All Search Console OAuth connections with working tokens
- ✅ All 300+ SEOWorks webhook task records
- ✅ All user authentication sessions
- ✅ All dealership client IDs and configurations
- ✅ All historical usage data and metrics
- ✅ All working SEOWorks integration mappings

## Current State (POST-DISASTER)
- **Agencies**: 0
- **Dealerships**: 0  
- **Users**: 0
- **Tasks**: 0
- **GA4 Connections**: 0
- **Search Console Connections**: 0
- **SEOWorks Tasks**: 0
- **Everything**: GONE

---

## COMPREHENSIVE REBUILD CHECKLIST

### Phase 1: Emergency Database Restoration
- [ ] **CRITICAL**: Restore database from backup (backup-2025-08-19T05-05-27-242Z.sql)
- [ ] Verify all 2 agencies are restored
- [ ] Verify all 20+ dealerships are restored with correct clientIds
- [ ] Verify all 4+ users are restored with correct roles
- [ ] Test database connectivity and schema integrity

### Phase 2: Authentication System Recovery
- [ ] **SUPER ADMIN ACCESS**: Restore Josh Copp's super admin account
- [ ] **AGENCY ADMIN ACCESS**: Restore agency admin accounts
- [ ] **DEALERSHIP ACCESS**: Restore all dealership manager accounts
- [ ] Test login functionality for each user type
- [ ] Verify role-based access controls are working
- [ ] Reset any compromised API keys or tokens

### Phase 3: SEOWorks Integration Restoration
- [ ] **CLIENT ID MAPPING**: Restore all dealership clientId mappings
- [ ] **WEBHOOK CONFIGURATION**: Verify webhook endpoints are receiving data
- [ ] **TASK PROCESSING**: Test incoming webhook task creation
- [ ] **SEOWORKS AGENCY SETUP**: Ensure SEOWORKS agency is configured correctly
- [ ] Test end-to-end task flow from SEOWorks webhook to database

### Phase 4: Google OAuth Connections Recovery
- [ ] **GA4 OAUTH SETUP**: Re-establish OAuth app configuration
- [ ] **SEARCH CONSOLE OAUTH**: Re-establish Search Console OAuth
- [ ] **TOKEN REFRESH MECHANISM**: Verify token refresh workflows
- [ ] **DEALERSHIP CONNECTIONS**: Guide users through re-authentication
- [ ] **PROPERTY ID MAPPING**: Restore GA4 property ID mappings per dealership

### Phase 5: Dealership Configurations
- [ ] **JAY HATFIELD DEALERSHIPS**: Restore all Jay Hatfield locations with correct GA4 IDs
- [ ] **PREMIER DEALERSHIPS**: Restore Premier Auto locations  
- [ ] **HATCHETT DEALERSHIPS**: Restore Hatchett Hyundai locations
- [ ] **SARCOXIE FORD**: Restore with GA4 ID 452793966
- [ ] **ACURA/GENESIS**: Restore specialty brand dealerships
- [ ] **CLIENT EMAIL MAPPINGS**: Verify all manager@domain.com emails are mapped

### Phase 6: Data Integrity & Testing  
- [ ] **ANALYTICS PIPELINE**: Test GA4 data fetching for each dealership
- [ ] **SEARCH CONSOLE DATA**: Test Search Console data fetching
- [ ] **TASK CREATION**: Test webhook task creation and processing
- [ ] **USER PERMISSIONS**: Test dealership switching and access controls  
- [ ] **REPORTING**: Test report generation for each dealership

### Phase 7: Production Validation
- [ ] **LIVE WEBHOOK TESTING**: Verify SEOWorks webhooks are processing
- [ ] **ANALYTICS DATA FLOW**: Confirm GA4/Search Console data is flowing
- [ ] **USER ACCEPTANCE**: Have each dealership manager test their dashboard
- [ ] **PERFORMANCE MONITORING**: Monitor for any performance issues
- [ ] **ERROR MONITORING**: Monitor for any authentication or API errors

### Phase 8: Disaster Prevention
- [ ] **AUTOMATED BACKUPS**: Implement hourly database backups
- [ ] **BACKUP VERIFICATION**: Test backup restoration process
- [ ] **MONITORING ALERTS**: Set up alerts for critical system failures
- [ ] **ACCESS CONTROLS**: Implement safeguards against accidental data loss
- [ ] **DOCUMENTATION**: Document all critical recovery procedures

---

## Critical Dependencies for Rebuild

### OAuth Applications (Google Cloud Console)
- [ ] GA4 OAuth Client ID and Secret configured
- [ ] Search Console OAuth Client ID and Secret configured  
- [ ] Redirect URIs properly configured for production domain
- [ ] API scopes properly configured (Analytics, Search Console)

### SEOWorks Integration
- [ ] Webhook endpoint URL configured in SEOWorks
- [ ] Client ID mapping table restored
- [ ] Task processing pipeline functional
- [ ] Agency-to-dealership routing working

### Environment Variables
- [ ] `DATABASE_URL` pointing to restored database
- [ ] `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` configured
- [ ] `NEXTAUTH_SECRET` configured  
- [ ] All encryption keys for OAuth tokens configured

### DNS and Domain Configuration
- [ ] Production domain pointing to correct application
- [ ] SSL certificates valid and working
- [ ] CORS settings allowing OAuth redirects

---

## EMERGENCY CONTACTS & RESOURCES

### Data Recovery
- **Database Backup Location**: `/Users/joshcopp/Desktop/final_seo_hub/backups/backup-2025-08-19T05-05-27-242Z.sql`
- **Backup Size**: 74,400 bytes
- **Backup Created**: 2025-08-19T05:05:27Z (BEFORE the disaster)

### Google Cloud Console Access
- Need access to Google Cloud Console for OAuth app configuration
- Need to verify redirect URIs and API scopes

### SEOWorks Integration
- Need SEOWorks team contact for webhook reconfiguration
- May need to verify all dealership client IDs with SEOWorks

---

## SUCCESS CRITERIA

### Minimum Viable Recovery
- [ ] All 2 agencies restored and functional  
- [ ] All 20+ dealerships restored with correct configurations
- [ ] All 4+ users can log in with proper permissions
- [ ] SEOWorks webhooks are creating tasks in database
- [ ] At least 5 priority dealerships have working GA4 connections

### Full Production Recovery
- [ ] 100% of dealerships have working GA4 connections
- [ ] 100% of dealerships have working Search Console connections  
- [ ] All users can access their respective dealership dashboards
- [ ] Analytics data is flowing for all properties
- [ ] SEOWorks task pipeline is processing 100% of incoming webhooks
- [ ] No authentication or authorization errors
- [ ] All historical data relationships are intact

---

**NEXT IMMEDIATE ACTION**: Restore database from backup file and begin Phase 1 recovery process.