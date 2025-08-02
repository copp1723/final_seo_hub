# MVP Development Tickets

## 🚨 Critical Priority (P0) - MVP Blockers

---

### TICKET-001: Implement Main Navigation Component
**Priority**: P0 - Critical  
**Estimated Time**: 3 hours  
**Blocked By**: None  
**Blocks**: All other UI work

**Description**:  
Users currently cannot navigate between different sections of the application. We need a persistent navigation component that appears on all authenticated pages.

**Acceptance Criteria**:
- [ ] Create navigation component with links to: Dashboard, Requests, Chat, Reporting
- [ ] Add user menu with name, avatar, and sign out option
- [ ] Highlight active page in navigation
- [ ] Responsive design (mobile hamburger menu)
- [ ] Add to main layout for all authenticated routes

**Technical Details**:
- Create `components/layout/navigation.tsx`
- Update `app/layout.tsx` to include navigation for authenticated users
- Use `usePathname()` from next/navigation for active state
- Implement mobile menu with state management

**Code Example**:
```typescript
// components/layout/navigation.tsx
import { usePathname } from 'next/navigation'
import Link from 'next/link'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/requests', label: 'Requests', icon: FileText },
  { href: '/chat', label: 'AI Assistant', icon: MessageSquare },
  { href: '/reporting', label: 'Analytics', icon: BarChart },
]
```

---

### TICKET-002: Build Onboarding Flow UI
**Priority**: P0 - Critical  
**Estimated Time**: 8 hours  
**Blocked By**: TICKET-001  
**Blocks**: New user signups

**Description**:  
New users need a way to complete onboarding with business details and package selection. The API endpoint exists but there's no UI.

**Acceptance Criteria**:
- [ ] Multi-step form with progress indicator
- [ ] Step 1: Business information (name, address, contact)
- [ ] Step 2: Package selection (Silver/Gold/Platinum) with features
- [ ] Step 3: Target information (keywords, cities, competitors)
- [ ] Form validation with error messages
- [ ] Submit to existing `/api/onboarding` endpoint
- [ ] Redirect to dashboard on completion

**Technical Details**:
- Create `app/onboarding/page.tsx`
- Use existing `onboardingSchema` from validations
- Add to middleware.ts to require for new users
- Store completion status in user record

**UI Components Needed**:
- Step indicator component
- Package selection cards with pricing
- Multi-select for cities/keywords
- Form navigation (next/previous)

---

### TICKET-003: Add Request Status Management UI
**Priority**: P0 - Critical  
**Estimated Time**: 6 hours  
**Blocked By**: TICKET-001  
**Blocks**: Request workflow

**Description**:  
Users can create requests but cannot update their status or mark tasks as complete. Need UI for managing request lifecycle.

**Acceptance Criteria**:
- [ ] Status update dropdown on request cards
- [ ] "Mark Complete" button for IN_PROGRESS requests
- [ ] Modal to add completion details (URL, title, notes)
- [ ] Update progress counters when tasks complete
- [ ] Show completed tasks list on request detail
- [ ] Add completion date tracking

**Technical Details**:
- Create `components/requests/status-updater.tsx`
- Create `components/requests/completion-modal.tsx`
- Add PUT endpoint to `/api/requests/[id]/route.ts`
- Update `completedTasks` JSON field structure

**API Endpoint**:
```typescript
// app/api/requests/[id]/route.ts
export async function PUT(request: NextRequest) {
  // Handle status updates
  // Handle task completion
  // Update progress counters
}
```

---

### TICKET-004: Implement Monthly Package Progress Reset
**Priority**: P0 - Critical  
**Estimated Time**: 4 hours  
**Blocked By**: None  
**Blocks**: Accurate package tracking

**Description**:  
Package progress counters currently accumulate forever. They need to reset at the start of each month to track monthly allowances.

**Acceptance Criteria**:
- [ ] Add `billingPeriodStart` field to track current period
- [ ] Reset counters when new month begins
- [ ] Preserve historical data for reporting
- [ ] Handle mid-month signups correctly
- [ ] Show "X of Y used this month" in UI

**Technical Details**:
- Add migration for new database fields
- Update `getCurrentMonthProgress()` in package-utils.ts
- Consider using a cron job or check on each request
- Store historical usage for reporting

**Database Changes**:
```prisma
model Request {
  // ... existing fields
  billingPeriodStart DateTime
  billingPeriodEnd   DateTime
}

model MonthlyUsage {
  id         String   @id @default(cuid())
  userId     String
  month      Int
  year       Int
  pagesUsed  Int
  blogsUsed  Int
  // ... etc
}
```

---

## 📊 High Priority (P1) - Core Features

---

### TICKET-005: Connect Real GA4 Analytics Data
**Priority**: P1 - High  
**Estimated Time**: 4 hours  
**Blocked By**: None  
**Blocks**: Analytics value

**Description**:  
GA4 integration exists but reporting page shows hardcoded demo data. Need to fetch and display real analytics.

**Acceptance Criteria**:
- [ ] Fetch real data from GA4 using existing service
- [ ] Display traffic trends chart
- [ ] Show top pages by traffic
- [ ] Add date range selector
- [ ] Handle loading and error states
- [ ] Cache data for performance

**Technical Details**:
- Update `app/reporting/page.tsx`
- Use `GA4Service` from lib/google/ga4Service.ts
- Add server action or API route for data fetching
- Consider using React Query for caching

---

### TICKET-006: Create User Settings Page
**Priority**: P1 - High  
**Estimated Time**: 6 hours  
**Blocked By**: TICKET-001  
**Blocks**: User self-service

**Description**:  
Users need a way to manage their account settings, view API keys, and manage integrations.

**Acceptance Criteria**:
- [ ] Profile section (name, email, avatar)
- [ ] Notification preferences
- [ ] API key management (view/regenerate)
- [ ] Integration status (GA4, Search Console)
- [ ] Package information and usage
- [ ] Change password functionality

**Technical Details**:
- Create `app/settings/page.tsx`
- Add tabs for different sections
- Create API endpoints for updates
- Use existing auth patterns

---

### TICKET-007: Implement Email Notifications
**Priority**: P1 - High  
**Estimated Time**: 8 hours  
**Blocked By**: None  
**Blocks**: User communication

**Description**:  
Users should receive email notifications for important events like request status changes and task completions.

**Acceptance Criteria**:
- [ ] Send email on request status change
- [ ] Send email on task completion
- [ ] Weekly progress summary email
- [ ] Notification preferences in settings
- [ ] Unsubscribe links
- [ ] Email templates with branding

**Technical Details**:
- Integrate email service (Resend/SendGrid)
- Create email templates
- Add email queue for reliability
- Update notification preferences model

**Email Templates Needed**:
- Request created confirmation
- Status changed notification
- Task completed notification
- Weekly summary
- Welcome email

---

## 🔧 Medium Priority (P2) - Enhancements

---

### TICKET-008: Add Request Filtering and Search
**Priority**: P2 - Medium  
**Estimated Time**: 4 hours  
**Blocked By**: None  
**Blocks**: None

**Description**:  
Requests page needs filtering and search capabilities for users with many requests.

**Acceptance Criteria**:
- [ ] Filter by status (pending, in progress, completed)
- [ ] Filter by type (page, blog, gbp_post)
- [ ] Search by title or description
- [ ] Sort by date, priority, status
- [ ] Persist filter preferences
- [ ] Clear filters option

**Technical Details**:
- Update `app/requests/page.tsx`
- Add query parameters for filters
- Update API to handle filtering
- Consider using URL state for persistence

---

### TICKET-009: Enhance Dashboard with Real Metrics
**Priority**: P2 - Medium  
**Estimated Time**: 6 hours  
**Blocked By**: TICKET-004  
**Blocks**: None

**Description**:  
Dashboard currently shows basic stats. Enhance with more useful metrics and visualizations.

**Acceptance Criteria**:
- [ ] Monthly progress bars for package usage
- [ ] Request status distribution chart
- [ ] Recent activity timeline
- [ ] Quick actions (new request, view reports)
- [ ] Performance metrics if GA4 connected
- [ ] Upcoming tasks/deadlines

**Technical Details**:
- Update `app/dashboard/page.tsx`
- Add chart components (use existing react-chartjs-2)
- Aggregate data efficiently
- Consider dashboard customization

---

### TICKET-010: Add CSV Export for Requests
**Priority**: P2 - Medium  
**Estimated Time**: 3 hours  
**Blocked By**: None  
**Blocks**: None

**Description**:  
Users need to export their request data for reporting and record-keeping.

**Acceptance Criteria**:
- [ ] Export button on requests page
- [ ] Include all request fields
- [ ] Include completed tasks details
- [ ] Date range selection for export
- [ ] Proper CSV formatting
- [ ] Download with meaningful filename

**Technical Details**:
- Add export endpoint to API
- Use streaming for large datasets
- Include proper headers for download
- Consider rate limiting exports

---

## 🧪 Lower Priority (P3) - Nice to Have

---

### TICKET-011: Add Request Templates
**Priority**: P3 - Low  
**Estimated Time**: 6 hours  
**Blocked By**: None  
**Blocks**: None

**Description**:  
Allow users to create templates for common request types to speed up creation.

**Acceptance Criteria**:
- [ ] Save request as template option
- [ ] Template management page
- [ ] Use template when creating request
- [ ] Template categories
- [ ] Share templates (future)

---

### TICKET-012: Implement Webhook Logs
**Priority**: P3 - Low  
**Estimated Time**: 4 hours  
**Blocked By**: None  
**Blocks**: None

**Description**:  
Add visibility into webhook activity for debugging and monitoring.

**Acceptance Criteria**:
- [ ] Log incoming webhooks
- [ ] Show webhook history in UI
- [ ] Filter by status/date
- [ ] Retry failed webhooks
- [ ] Webhook testing tool

---

## 🛡️ Technical Debt (P4)

---

### TICKET-013: Add Test Coverage
**Priority**: P4 - Technical Debt  
**Estimated Time**: 16 hours  
**Blocked By**: None  
**Blocks**: None

**Description**:  
Add testing infrastructure and initial test coverage for critical paths.

**Acceptance Criteria**:
- [ ] Set up Jest and React Testing Library
- [ ] Auth flow tests
- [ ] Request creation tests
- [ ] API endpoint tests
- [ ] Component unit tests
- [ ] 60% coverage target

---

### TICKET-014: Implement Proper Error Boundaries
**Priority**: P4 - Technical Debt  
**Estimated Time**: 4 hours  
**Blocked By**: None  
**Blocks**: None

**Description**:  
Add React error boundaries to gracefully handle errors and improve user experience.

**Acceptance Criteria**:
- [ ] Global error boundary
- [ ] Page-level error boundaries
- [ ] Error logging to service
- [ ] User-friendly error messages
- [ ] Error recovery options

---

## Implementation Order

**Week 1 Sprint (MVP Critical)**:
1. TICKET-001: Navigation (3h)
2. TICKET-002: Onboarding UI (8h)
3. TICKET-003: Request Status Management (6h)
4. TICKET-004: Monthly Reset (4h)

**Week 2 Sprint (Core Features)**:
5. TICKET-005: Real GA4 Data (4h)
6. TICKET-006: Settings Page (6h)
7. TICKET-007: Email Notifications (8h)

**Week 3 Sprint (Enhancements)**:
8. TICKET-008: Filtering/Search (4h)
9. TICKET-009: Enhanced Dashboard (6h)
10. TICKET-010: CSV Export (3h)

**Backlog**:
- TICKET-011 through TICKET-014 as time permits

---

## Notes for Development Team

1. **Start with TICKET-001** - Nothing else works without navigation
2. **Test on mobile** - Many users will access on phones
3. **Use existing patterns** - Auth, API, and database patterns are established
4. **Ask about unknowns** - GA4 setup, email service choice, etc.
5. **Update documentation** - As you implement features

Each ticket should result in a PR with:
- Implementation
- Basic tests (where applicable)
- Documentation updates
- Screenshot/demo for UI changes