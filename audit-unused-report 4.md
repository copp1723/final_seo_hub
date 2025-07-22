# Safe Audit Report: Unused Code, Exports, and Dependencies

**This report is for review only. No code or config changes have been made. All findings are candidates for manual review and confirmation.**

---

## 1. Unused Files (from KNIP)

> **Candidates for review:**  
> These files are not referenced by any other code or entrypoint. Some may be legacy, test, or script files.  
> **Do not delete without manual confirmation.**

```
.cleanup_removed_content_notification_demo.tsx
.cleanup_removed_debug_client_page.tsx
.cleanup_removed_debug_page.tsx
.cleanup_removed_notification_debug_panel.tsx
.cleanup_removed_notification_system_demo.tsx
add-tokens-to-existing-users.js
check-users.js
create-admin-user.js
debug-auth-flow.js
debug-users.js
fix-all-remaining-errors.js
fix-auth-checks.js
fix-closing-brackets.js
fix-final-syntax-errors.js
fix-property-access-errors.js
fix-remaining-syntax-errors.js
jest.config.standalone.js
jest.setup.js
jest.setup.standalone.js
test-emergency-access.js
test-simple-auth.js
components/icons.tsx
components/lazy-components.tsx
app/error-dev.tsx
config/jest.config.js
config/jest.setup.js
config/sentry.client.config.ts
config/sentry.edge.config.ts
config/sentry.server.config.ts
constants/terminology.ts
hooks/index.ts
hooks/use-analytics.ts
hooks/use-async.ts
hooks/use-debounce.ts
hooks/use-local-storage.ts
hooks/useCSRF.ts
lib/db-utils.ts
lib/features.ts
lib/rate-limit-redis.ts
middleware/compression.ts
middleware/cors.ts
middleware/simple-middleware.ts
prisma/seed.ts
scripts/assign-dealership.js
scripts/bulk-create-dealerships.ts
scripts/bulk-create-jay-hatfield-dealerships-with-clientid.ts
scripts/check-database-schema.js
scripts/check-seowerks-dealerships.js
scripts/create-dealerships-bulk.ts
scripts/create-demo-dealerships.js
scripts/create-seowerks-test-dealership.js
scripts/create-test-requests-for-jeff.ts
scripts/diagnose-prisma-deps.js
scripts/fix-account-linking.js
scripts/fix-user-fields.ts
scripts/force-create-session.js
scripts/generate-invitation-token-render.js
scripts/generate-invitation-token.js
scripts/generate-keys-standalone.ts
scripts/generate-login-link.js
scripts/generate-magic-link-for-user.js
scripts/get-agency-id.ts
scripts/import-real-dealerships.js
scripts/list-google-properties.js
scripts/preview-content-notification.js
scripts/preview-content-notification.ts
scripts/seoworks-integration-helper.js
scripts/setup-all-dealerships.js
scripts/setup-demo-connections.js
scripts/setup-jay-hatfield-dealerships.js
scripts/test-csv-processing.ts
scripts/test-db-connection.js
scripts/test-impersonation.js
scripts/test-seowerks-integration.js
scripts/test-seoworks-onboarding.js
scripts/verify-dealerships.ts
components/admin/enhanced-agency-form.tsx
components/admin/user-impersonation.tsx
components/analytics/analytics-error.tsx
components/analytics/date-range-selector.tsx
components/analytics/metrics-card.tsx
components/chat/seo-chat.tsx
components/dashboard/PackageUsageProgress.tsx
components/dashboard/StatusDistributionChart.tsx
components/dashboard/UpcomingTasks.tsx
components/dashboard/task-widget.tsx
components/demo/content-notification-demo.tsx
components/demo/notification-system-demo.tsx
components/layout/auth-layout.tsx
components/layout/authenticated-layout.tsx
components/onboarding/business-information-step.tsx
components/onboarding/package-selection-step.tsx
components/onboarding/target-information-step.tsx
components/requests/completion-modal.tsx
components/requests/enhanced-request-card.tsx
components/requests/infinite-scroll-requests.tsx
components/requests/request-card.tsx
components/requests/status-updater.tsx
components/ui/dropdown.tsx
components/ui/lazy-image.tsx
components/ui/progress.tsx
components/ui/tooltip.tsx
app/lib/features.ts
lib/ai/task-context.ts
app/api/chat/route 2.ts
app/lib/ai/enhanced-prompts.ts
app/lib/cache/performance-cache.ts
app/api/super-admin/system/settings/route-backup.ts
```

---

## 2. Unused Exports (from KNIP & ts-prune)

> **Candidates for review:**  
> These exports are not imported or used by any other file.  
> **Some may be used dynamically or in tests.**

**Examples (not exhaustive):**
- `components/icons.tsx: GoogleIcon`
- `components/lazy-components.tsx: LazyChart, LazyLineChart, LazyBarChart, LazyDoughnutChart, LazySEOChat, LazyEscalationModal`
- `constants/terminology.ts: TERMINOLOGY`
- `hooks/index.ts: useDebounce, useAsync, useLocalStorage, useToast, useAnalytics`
- `lib/db-utils.ts: batchOperations, optimizedQueries, connectionHealth`
- `lib/features.ts: getUserFeatures, isInTestGroup, useFeature, checkFeature`
- `lib/encryption.ts: generateAllKeys`
- `lib/branding/config.ts: getBrandingForAgency, getBrandingForCurrentRequest`
- `lib/branding/metadata.ts: generateDynamicMetadata`
- `lib/mailgun/client.ts: isValidEmail`
- `lib/mailgun/secure-tokens.ts: storeUnsubscribeToken`
- `lib/services/csv-dealership-processor.ts: ProcessingLogData`
- `lib/services/csv-security.ts: FileValidationResult`
- `lib/utils/csv-parser.ts: ParseOptions`
- `lib/validations/dealership-csv.ts: MailgunWebhookPayload, CSV_TEMPLATE`
- `lib/validations/index.ts: updateRequestSchema, CreateRequestInput, UpdateRequestInput, SEOWorksWebhookPayload, updateProfileSchema, userPreferencesSchema, UpdateProfileInput, NotificationPreferencesInput, UserPreferencesInput, onboardingSchema, OnboardingData`
- `app/lib/features.ts: getUserFeatures, isInTestGroup, useFeature, checkFeature, isStaging, isProduction`
- ...and many more (see full ts-prune and knip reports for details).

---

## 3. Unused Dependencies (from depcheck & KNIP)

> **Candidates for review:**  
> These npm packages are listed in package.json but not required by any code.  
> **Some may be used in scripts, tests, or dynamically.**

**Unused dependencies:**
- `@auth/prisma-adapter`
- `@hookform/resolvers`
- `autoprefixer`
- `google-auth-library`
- `postcss`
- `@radix-ui/react-progress`
- `@sentry/nextjs`
- `glob`
- `react-hook-form`
- `tailwindcss-animate`

**Unused devDependencies:**
- `audit-ci`
- `depcheck`
- `knip`
- `prettier`
- `redis-memory-server`
- `ts-node`
- `ts-prune`

---

## 4. Unlisted/Missing/Unresolved Dependencies

> **Candidates for review:**  
> These are required in code but not listed in package.json, or vice versa.

**Examples:**
- `jose` (used in `app/api/auth/session/route.ts`)
- `uuid` (used in `create-admin-user.js`)
- `node-fetch` (used in `debug-auth-flow.js`)
- `@prisma/engines` (used in `scripts/diagnose-prisma-deps.js`)

---

## 5. Notes & Warnings

- **Dynamic usage:** Some files/exports/dependencies may be used via dynamic import, reflection, or in test/dev scripts. Always confirm before removal.
- **Test files/scripts:** Many unused files are test or migration scripts. Confirm with the team before any action.
- **CI/CD/Config:** Some dependencies may be used in CI/CD or config files only.

---

## 6. Next Steps

1. **Manual review:** Go through each candidate above and confirm if it is truly unused.
2. **Mark as safe to remove** or "keep" after confirmation.
3. **Plan staged, reversible cleanup** (feature branch, PR, full test suite, code review).
4. **No deletions or changes should be made until all findings are confirmed.**

---

**This report is for planning and review only. No code or config changes have been made.**