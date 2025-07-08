# White-Label Branding Guide

This guide explains how to set up and configure white-label branding for different agencies in the Rylie SEO Hub platform.

## Table of Contents

- [Overview](#overview)
- [Branding Configuration Methods](#branding-configuration-methods)
  - [Method 1: Predefined Agency Configurations](#method-1-predefined-agency-configurations)
  - [Method 2: Database-Driven Agency Settings](#method-2-database-driven-agency-settings)
  - [Method 3: Domain-Based Branding](#method-3-domain-based-branding)
- [Setting Up a New Agency](#setting-up-a-new-agency)
  - [Quick Setup (Predefined)](#quick-setup-predefined)
  - [Database Setup (Flexible)](#database-setup-flexible)
  - [Domain Mapping](#domain-mapping)
- [Branding Components](#branding-components)
  - [Company Name](#company-name)
  - [Colors](#colors)
  - [Logo](#logo)
  - [Email Templates](#email-templates)
  - [Support Email](#support-email)
- [Email System Integration](#email-system-integration)
- [Testing Branding Changes](#testing-branding-changes)
- [Advanced Customization](#advanced-customization)
- [Troubleshooting](#troubleshooting)

## Overview

The Rylie SEO Hub platform includes a comprehensive white-label branding system that allows different agencies to have completely customized branding including company names, colors, logos, and email templates while using the same backend platform.

## Branding Configuration Methods

There are three primary methods for configuring agency branding:

### Method 1: Predefined Agency Configurations

Agencies can be defined in the code configuration file at `lib/branding/config.ts`:

```typescript
export const AGENCY_BRANDINGS: Record<string, BrandingConfig> = {
  'rylie': {
    companyName: 'Rylie SEO Hub',
    primaryColor: '#2563eb',
    secondaryColor: '#1d4ed8',
    emailFromName: 'Rylie SEO',
    supportEmail: 'support@rylieseo.com',
    domain: 'rylie-seo-hub.onrender.com'
  },
  'sally': {
    companyName: 'Sally SEO Solutions',
    primaryColor: '#059669',
    secondaryColor: '#047857',
    emailFromName: 'Sally SEO',
    supportEmail: 'support@sallyseo.com',
    domain: 'sally-seo.onrender.com'
  }
}
```

This method is best for:
- A fixed number of agencies
- Development and testing environments
- Quickly setting up new agencies without database changes

### Method 2: Database-Driven Agency Settings

Agencies can store custom branding in their database settings. The system checks the Agency model's `settings` JSON field for branding configuration:

```json
{
  "branding": {
    "companyName": "Custom Agency Name",
    "primaryColor": "#ff6b35",
    "secondaryColor": "#ff8c42",
    "emailFromName": "Custom Agency",
    "supportEmail": "support@customagency.com",
    "logoUrl": "https://customagency.com/logo.png"
  }
}
```

This method is best for:
- Dynamic configuration without code changes
- Admin UI-managed branding
- More flexible branding options

### Method 3: Domain-Based Branding

The system automatically detects branding based on the domain being accessed. When a user visits a specific domain, the system looks up the corresponding agency branding.

This method is best for:
- Multi-domain deployments
- Completely separate agency experiences
- White-label solutions with custom domains

## Setting Up a New Agency

### Quick Setup (Predefined)

1. Edit the `lib/branding/config.ts` file to add the new agency:

```typescript
'newagency': {
  companyName: 'New Agency SEO',
  primaryColor: '#9333ea',
  secondaryColor: '#7e22ce',
  emailFromName: 'New Agency SEO',
  supportEmail: 'support@newagency.com',
  logoUrl: 'https://newagency.com/logo.png',
  domain: 'newagency.seohub.com'
}
```

2. Deploy the application
3. The agency will automatically get their branding when accessing their domain

### Database Setup (Flexible)

1. Create an Agency record in the database:

```sql
INSERT INTO "Agency" (id, name, domain, settings)
VALUES (
  'cuid123', 
  'New Agency', 
  'newagency.seohub.com',
  '{"branding":{"companyName":"New Agency SEO","primaryColor":"#9333ea","secondaryColor":"#7e22ce","emailFromName":"New Agency SEO","supportEmail":"support@newagency.com","logoUrl":"https://newagency.com/logo.png"}}'
);
```

2. Using the API:

```bash
curl -X POST https://your-domain.com/api/admin/agencies \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "New Agency",
    "domain": "newagency.seohub.com",
    "settings": {
      "branding": {
        "companyName": "New Agency SEO",
        "primaryColor": "#9333ea",
        "secondaryColor": "#7e22ce",
        "emailFromName": "New Agency SEO",
        "supportEmail": "support@newagency.com",
        "logoUrl": "https://newagency.com/logo.png"
      }
    }
  }'
```

3. Using the Super Admin UI:
   - Navigate to Super Admin → Agencies
   - Click "Add Agency"
   - Fill out the form including branding settings
   - Click "Create Agency"

### Domain Mapping

1. Set up DNS for the custom domain to point to your application
2. Configure the domain in your agency settings
3. Update your hosting platform (e.g., Render.com) to handle the custom domain
4. SSL certificate should be provisioned automatically

## Branding Components

### Company Name

The `companyName` field controls how the agency name appears throughout the application:

- Navigation bar logo text
- Page titles
- Email headings
- Login screen
- Error pages

### Colors

Two main colors define the brand identity:

- `primaryColor`: The main brand color used for:
  - Buttons
  - Navigation highlights
  - Progress bars
  - Links
  
- `secondaryColor`: Used for:
  - Hover states
  - Secondary buttons
  - Gradients
  - Backgrounds

Colors should be defined as hexadecimal values (e.g., `#2563eb`).

### Logo

The `logoUrl` field defines the custom logo to use. Guidelines for logos:

- Optimal size: 180px × 50px
- Format: SVG preferred, PNG with transparency accepted
- Dark and light versions are recommended for different UI modes
- Host on a reliable CDN for best performance

### Email Templates

All email templates dynamically incorporate the agency branding:

- Company name in the header
- Brand colors for buttons and highlights
- Custom "From" name
- Footer with the proper support email

### Support Email

The `supportEmail` field is used for:

- Reply-to address on all system emails
- Contact information in the footer
- Help links throughout the application

## Email System Integration

The email system is integrated with the branding system through:

1. **Template Customization**: All email templates accept branding configuration
2. **Mailgun Client**: Uses dynamic "from" names and support emails
3. **Unsubscribe Pages**: Styled with agency-specific colors and branding

Example email template implementation:

```typescript
// In lib/email/templates/requestUpdate.ts
export function generateRequestUpdateEmail(request, user, branding) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: ${branding.primaryColor}; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">${branding.companyName}</h1>
      </div>
      <div style="padding: 20px;">
        <p>Hello ${user.name},</p>
        <p>Your request "${request.title}" has been updated to status: ${request.status}.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.NEXTAUTH_URL}/requests/${request.id}" 
             style="background-color: ${branding.primaryColor}; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
            View Request
          </a>
        </div>
        <p>Thank you,<br>${branding.emailFromName} Team</p>
      </div>
      <div style="background-color: #f4f4f4; padding: 15px; font-size: 12px; text-align: center;">
        <p>If you have any questions, please contact <a href="mailto:${branding.supportEmail}">${branding.supportEmail}</a></p>
        <p>
          <a href="${process.env.NEXTAUTH_URL}/unsubscribe?email=${user.email}&token=${unsubscribeToken}">
            Unsubscribe
          </a>
        </p>
      </div>
    </div>
  `;
}
```

## Testing Branding Changes

Before deploying branding changes to production:

1. **Visual Test**: Test the branding changes in a development environment
2. **Email Test**: Send test emails to verify branding is applied correctly
3. **Domain Test**: Verify the domain-based branding detection is working
4. **Responsive Test**: Ensure branding works across desktop and mobile views

Test commands:

```bash
# Test email rendering with custom branding
npm run dev

# In another terminal
curl -X POST http://localhost:3000/api/debug/email-test \
  -H "Content-Type: application/json" \
  -d '{
    "agency": "newagency",
    "email": "your-email@example.com"
  }'
```

## Advanced Customization

For more advanced customization beyond the basic branding options:

### Custom CSS Overrides

Create a custom CSS file for agency-specific styles:

```typescript
// In lib/branding/custom-css.ts
export const AGENCY_CUSTOM_CSS: Record<string, string> = {
  'newagency': `
    .main-header { 
      background: linear-gradient(to right, #9333ea, #7e22ce); 
    }
    .custom-button {
      border-radius: 8px;
    }
  `
}
```

### Custom Components

For significantly different UI elements:

```typescript
// In components/branding/AgencySpecificComponents.tsx
import { useAgency } from '@/hooks/useAgency';

export function CustomHeader() {
  const { agency } = useAgency();
  
  if (agency.id === 'newagency') {
    return <NewAgencyCustomHeader />;
  }
  
  return <DefaultHeader />;
}
```

## Troubleshooting

### Branding Not Applied

If branding is not being applied correctly:

1. **Check Domain Configuration**: Ensure the domain is correctly set in the agency settings
2. **Clear Cache**: Clear browser cache and application cache
3. **Verify Settings**: Check that the branding settings are correctly formatted
4. **Check Console Errors**: Look for JavaScript errors in the browser console

### Email Branding Issues

If email branding is not working:

1. **Check Templates**: Verify the email templates are using the branding variables
2. **Test Email Function**: Use the debug endpoint to test email rendering
3. **Check Mailgun Logs**: Verify emails are being sent correctly

### Logo Not Displaying

If the logo is not displaying:

1. **Check URL**: Ensure the logo URL is accessible and correct
2. **CORS Issues**: Verify there are no CORS restrictions on the logo URL
3. **Format Support**: Ensure the logo format is supported (SVG, PNG, JPG)
4. **Size Issues**: Check if the logo dimensions are appropriate

### Color Consistency

If colors appear inconsistent:

1. **Check Color Format**: Ensure colors are in hexadecimal format
2. **Color Contrast**: Verify colors have sufficient contrast for accessibility
3. **Browser Compatibility**: Test in different browsers
