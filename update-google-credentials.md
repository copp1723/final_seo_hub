# Update Google Credentials for New Project

## 🔄 Environment Variables to Update

After creating your new Google Cloud project `seo-hub-465517`, you'll need to update these environment variables in your Render deployment:

### **Current Values (to replace):**
```
GOOGLE_CLIENT_ID=703879232708-tkq8cqhhu9sr3qrqeniff908erda3i7v.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
```

### **New Values (from your new project):**
```
GOOGLE_CLIENT_ID=[NEW_CLIENT_ID_FROM_seo-hub-465517]
GOOGLE_CLIENT_SECRET=[NEW_CLIENT_SECRET_FROM_seo-hub-465517]
```

### **Service Account (Remove These):**
Since you're moving away from service account, you can remove:
```
GA4_SERVICE_ACCOUNT_EMAIL=seo-ga4-service@onekeel-seo.iam.gserviceaccount.com
GA4_TOKEN_ENCRYPTION_KEY=72a46b754c093e92125786342215c1336b71907ae8c8579c07f650f443ea5c84
```

## 🔧 Steps to Get New Credentials

### **1. Enable Required APIs**
In your new project `seo-hub-465517`, enable:
- Google Analytics Reporting API
- Google Analytics Data API (GA4) 
- Google Search Console API
- Google+ API (for user info)

### **2. Create OAuth 2.0 Credentials**
1. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
2. Application type: **Web application**
3. Name: `Rylie SEO Hub Production`
4. Authorized JavaScript origins:
   ```
   https://rylie-seo-hub.onrender.com
   ```
5. Authorized redirect URIs:
   ```
   https://rylie-seo-hub.onrender.com/api/auth/callback/google
   https://rylie-seo-hub.onrender.com/api/ga4/auth/callback
   https://rylie-seo-hub.onrender.com/api/search-console/auth/callback
   ```

### **3. Configure OAuth Consent Screen**
- **App name:** Rylie SEO Hub
- **User support email:** access@seoworks.ai
- **Developer contact:** access@seoworks.ai
- **App domain:** https://rylie-seo-hub.onrender.com
- **Privacy Policy:** https://rylie-seo-hub.onrender.com/privacy
- **Terms of Service:** https://rylie-seo-hub.onrender.com/terms

### **4. Add Test Users (Important!)**
Since you're using "External" audience, add these as test users:
- access@seoworks.ai
- josh.copp@onekeel.ai
- Any other team members

### **5. Request Scopes**
Add these scopes to your OAuth consent screen:
```
https://www.googleapis.com/auth/analytics.readonly
https://www.googleapis.com/auth/webmasters.readonly  
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/userinfo.profile
```

## 🎯 Benefits of This Approach

### **✅ Advantages:**
- **No service account complexity** - Direct OAuth flow
- **Better for agencies** - Can access multiple client accounts
- **Easier permission management** - Just add `access@seoworks.ai` to each GA4 property
- **More transparent** - Clear audit trail of which account is accessing what

### **🔄 Migration Process:**
1. **Create new project** (you're doing this now)
2. **Update environment variables** in Render
3. **Re-authenticate** all GA4 and Search Console connections
4. **Add `access@seoworks.ai`** to all dealership GA4 properties
5. **Test dealership filtering** with new credentials

## 🚨 Important Notes

### **GA4 Property Access:**
You'll need to add `access@seoworks.ai` as a **Viewer** to each dealership's GA4 property:
- Jay Hatfield Chevrolet of Columbus (Property ID: 323480238)
- Jay Hatfield Chevrolet GMC of Chanute (Property ID: 323404832)
- Jay Hatfield Chevrolet GMC of Pittsburg (Property ID: 371672738)
- [All other dealership properties...]

### **Search Console Access:**
Similarly, add `access@seoworks.ai` as a **User** to each Search Console property.

### **Testing:**
After updating credentials:
1. Clear all existing GA4/Search Console connections in your app
2. Re-authenticate using the new OAuth flow
3. Test dealership switching
4. Verify different data appears for different dealerships

## 📋 Deployment Checklist

- [ ] Create OAuth 2.0 credentials in new project
- [ ] Update GOOGLE_CLIENT_ID in Render
- [ ] Update GOOGLE_CLIENT_SECRET in Render  
- [ ] Remove old service account env vars
- [ ] Add access@seoworks.ai to all GA4 properties
- [ ] Add access@seoworks.ai to all Search Console properties
- [ ] Clear existing connections in app
- [ ] Re-authenticate all connections
- [ ] Test dealership filtering
- [ ] Verify different data per dealership
