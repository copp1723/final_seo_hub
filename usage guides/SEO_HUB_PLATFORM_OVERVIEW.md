# SEO Hub Platform Documentation

## Table of Contents
1. User Roles & Permissions
2. Onboarding a New Agency (SUPER ADMIN)
3. Onboarding a New Dealership (Agency)
4. Inviting & Managing Users
5. Platform Features & Functionality
6. Dashboard Overview
7. Requests & Task Management
8. Reporting & Analytics
9. Settings & Preferences

---

## User Roles & Permissions

### SUPER_ADMIN
- Can create and manage agencies.
- Has access to all agencies, users, and system settings.
- Can promote users to SUPER_ADMIN (via special endpoint).

### ADMIN
- Agency-level admin. Can manage users and requests within their agency.

### USER
- Standard user (e.g., dealership). Can submit requests, view progress, and manage their own profile.

Each user is associated with an `agencyId` (except SUPER_ADMIN, who can see all).

---

## Onboarding a New Agency (SUPER ADMIN)

**Who:** Only SUPER_ADMIN  
**Where:** `/admin` dashboard

**Steps:**
1. Log in as SUPER_ADMIN.
2. Navigate to the Admin Dashboard (`/admin`).
3. Click "Create Agency".
4. Fill in the agency name (domain is optional).
5. Submit the form.
6. The new agency appears in the agencies list, with user and request counts.

**Technical Details:**
- POST to `/api/admin/agencies` with `{ name, domain }`.
- Agency is created in the database and can now have users and requests associated.

---

## Onboarding a New Dealership (Agency)

**Who:** Agency user or admin  
**Where:** `/onboarding` page

**Steps:**
1. Log in as an agency user.
2. Go to the onboarding page (`/onboarding`).
3. Complete the multi-step form:
   - Business Information
   - Package Selection (Silver, Gold, Platinum)
   - Target Information (vehicle models, cities, competitor dealers)
4. Submit the form.

**The dealership is now onboarded:**
- Their user record is updated with onboarding status and package info.
- The dealership is linked to the agency via `agencyId`.
- Onboarding data is sent to SEOWorks via webhook (if configured).

**Technical Details:**
- POST to `/api/onboarding` with all dealership info.
- User record is updated: `onboardingCompleted`, `activePackageType`, billing period, etc.

---

## Inviting & Managing Users

- User creation is typically handled via authentication (e.g., Google sign-in).
- Each user is linked to an agency.
- User roles can be managed by agency admins or SUPER_ADMIN.
- There is a temporary endpoint to promote a user to SUPER_ADMIN (`/api/admin/promote`).

---

## Platform Features & Functionality

### Dashboard Overview
- **Active Requests:** Number of in-progress requests.
- **Tasks Completed:** Number of tasks completed this month (with package progress).
- **Total Requests:** All-time request count.
- **Package Progress:** Visual bars for pages, blogs, GBP posts, improvements.
- **Quick Actions:** Create new request, view all requests, view reports.

### Requests & Task Management
- **Requests:** Users can create SEO/content requests (pages, blogs, GBP posts, improvements).
- **Request Status:** Track status (Pending, In Progress, Completed, Cancelled).
- **Tasks:** Each request can have multiple tasks, with enhanced visibility:
  - Task cards show type, status, priority, due date, and quick actions.
  - Tasks can be filtered, searched, and sorted.
  - Dedicated `/tasks` page for unified task management.
- **Progress Tracking:** Usage counters reset monthly; progress bars show quota usage.

### Reporting & Analytics
- **Unified Reporting Dashboard:** Combines Google Analytics 4 (GA4) and Search Console data.
- **Tabs:**
  - Overview: Combined metrics (sessions, users, organic clicks, CTR).
  - Traffic Analytics: GA4-focused.
  - Search Performance: Search Console-focused.
- **Visualizations:** Metrics cards, traffic charts, search query tables, and more.

### Settings & Preferences
- **Profile:** Update name, email, and view role.
- **Notifications:** Manage email preferences for request updates, task completions, weekly summaries, and marketing.
- **Integrations:** Connect Google Analytics and Search Console for enhanced reporting.

---

## Visual Flow

- SUPER_ADMIN creates Agency
- Agency invites/adds AgencyUser
- AgencyUser onboards Dealership
- Dealership submits Requests
- Requests generate Tasks
- Tasks tracked in Dashboard
- Dealership views Reports

---

## Feature Highlights
- **Multi-Tenant:** Agencies manage their own dealerships and users.
- **Role-Based Access:** Permissions enforced at API and UI level.
- **Enhanced Task Visibility:** Dedicated task views, color-coded status, quick actions.
- **Unified Analytics:** All key SEO and traffic metrics in one place.
- **Automated Usage Tracking:** Monthly resets, package quotas, and progress bars.
- **Webhook Integrations:** Seamless data flow to/from SEOWorks.

---

## Quick Start for SEO WORKS (as SUPER ADMIN)

1. Log in and promote your user to SUPER_ADMIN (if not already).
2. Create agencies for each client group or region.
3. Add/invite users to each agency (users are linked by `agencyId`).
4. Guide agency users to onboard new dealerships via the onboarding form.
5. Monitor activity via the admin dashboard and reporting tabs.
6. Manage platform settings and integrations as needed.

---

This documentation covers the full lifecycle from agency creation to dealership onboarding, user management, and platform feature usage. If you need API payload examples, UI screenshots, or more granular workflow details, just ask!
