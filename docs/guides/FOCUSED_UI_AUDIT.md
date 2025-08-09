### Focused UI Audit

This guide explains how to run a local, automated UI audit that verifies:

- **Clean mounts**: each page loads without console errors
- **Primary actions work**: buttons and navigation trigger effects (no dead buttons)
- **WebSocket visibility**: any sockets are detected (no connection errors)
- **API shapes**: JSON responses parse cleanly or show graceful fallbacks

### Prerequisites

- Dev server running on `http://localhost:3000`:
  - `BASE_URL` will default to that
- A user in the database. The audit signs in with `simple-signin` using `UI_AUDIT_EMAIL`.
  - Default: `josh.copp@onekeel.ai`
  - Override via env: `UI_AUDIT_EMAIL="you@example.com"`

### Install Playwright (one-time)

```bash
npm i -D playwright glob
npx playwright install --with-deps
```

### Run the audit

In one shell:

```bash
BASE_URL=http://localhost:3000 npm run dev
```

In another shell:

```bash
UI_AUDIT_EMAIL="you@example.com" npm run ui:audit
```

### What it does

- Discovers all `app/**/page.tsx` routes (excluding dynamic `[param]` paths)
- Authenticates via `GET /api/auth/simple-signin?email=...`
- For each route:
  - Captures console errors and network 5xxs
  - Parses JSON responses to catch invalid shapes
  - Detects WebSocket endpoints if any are opened by the page
  - Clicks up to 3 primary/clickable buttons to detect dead actions
  - Saves a screenshot per route under `ui-audit-screenshots/`
- Writes a consolidated `ui-audit-report.json`

### Output

- `ui-audit-report.json` with per-route details and an aggregate summary
- `ui-audit-screenshots/*.png`

### Tuning

- Limit clicks per route: `UI_AUDIT_MAX_CLICKS=2`
- Change base URL: `BASE_URL=https://localhost:3001`
- Change audit email: `UI_AUDIT_EMAIL=qa@example.com`

### Notes

- Dynamic routes (e.g., `/requests/[id]`) are skipped; add fixtures if needed.
- Destructive buttons are skipped heuristically (red gradients or `destructive` class).
- If your auth setup changes, adjust the sign-in step in `scripts/run-ui-audit.ts`.


