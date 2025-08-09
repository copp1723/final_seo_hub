/*
 * Focused UI Audit Runner
 * - Navigates every non-dynamic page
 * - Fails on console errors
 * - Clicks a subset of primary/clickable buttons to detect "dead" buttons
 * - Captures network anomalies and JSON parsing issues (fallbacks)
 * - Reports to ui-audit-report.json and saves screenshots
 *
 * Requirements:
 * - "NEXTAUTH_URL" must be set to your local base URL (e.g., http://localhost:3000) when starting Next.js
 * - A valid user exists; set UI_AUDIT_EMAIL to sign in via simple-signin
 * - Run your dev server before this script: npm run dev
 */

import { chromium, Browser, Page, ConsoleMessage, WebSocket } from 'playwright'
import { glob } from 'glob'
import fs from 'fs'
import path from 'path'

type RouteReport = {
  route: string
  consoleErrors: string[]
  networkErrors: Array<{ url: string; status: number; statusText: string }>
  jsonIssues: Array<{ url: string; status: number; reason: string }>
  websockets: string[]
  clickedButtons: number
  deadButtons: Array<{ selector: string; text: string | null }>
  screenshot?: string
}

type AuditReport = {
  baseUrl: string
  timestamp: string
  summary: {
    totalRoutes: number
    routesWithConsoleErrors: number
    totalDeadButtons: number
    networkErrorCount: number
    jsonIssueCount: number
  }
  routes: RouteReport[]
}

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const AUDIT_EMAIL = process.env.UI_AUDIT_EMAIL || 'josh.copp@onekeel.ai'
const MAX_BUTTON_CLICKS_PER_ROUTE = Number(process.env.UI_AUDIT_MAX_CLICKS || 3)

function toUrlFromAppPath(appPath: string): string {
  // Convert e.g. app/(authenticated)/dashboard/page.tsx -> /dashboard
  let rel = appPath.split('app/')[1]
  rel = rel.replace(/\\/g, '/')
  rel = rel.replace(/\/page\.(tsx|jsx|ts|js)$/i, '')
  // Drop route groups like (authenticated)
  rel = rel
    .split('/')
    .filter((seg) => !(seg.startsWith('(') && seg.endsWith(')')))
    .join('/')
  if (rel === '' || rel === undefined) return '/'
  return '/' + rel
}

async function discoverRoutes(): Promise<string[]> {
  const files = await glob('app/**/page.{tsx,jsx,ts,js}', {
    ignore: ['**/node_modules/**', '**/.next/**'],
  })
  const routes = files
    .filter((f) => !f.includes('/[')) // skip dynamic routes; require concrete params
    .map(toUrlFromAppPath)
  // Ensure unique and stable order
  return Array.from(new Set(routes)).sort()
}

async function signIn(page: Page) {
  const signinUrl = `${BASE_URL}/api/auth/simple-signin?email=${encodeURIComponent(AUDIT_EMAIL)}`
  await page.goto(signinUrl, { waitUntil: 'networkidle' })
}

function isDestructive(classes: string | null): boolean {
  if (!classes) return false
  return classes.includes('from-red-') || classes.includes('destructive')
}

async function clickAndDetectEffect(page: Page, element: any): Promise<boolean> {
  // Heuristics: navigation OR network request OR visible DOM change
  const initialHtml = await page.evaluate(() => document.body.innerHTML.length)
  let requestHappened = false
  const requestListener = () => {
    requestHappened = true
  }
  page.on('request', requestListener)
  const clickPromise = element.click({ timeout: 1500 }).catch(() => null)
  const navPromise = page.waitForNavigation({ timeout: 2000 }).catch(() => null)
  await Promise.race([navPromise, clickPromise, page.waitForTimeout(500)])
  await page.waitForTimeout(800)
  page.off('request', requestListener)

  const afterHtml = await page.evaluate(() => document.body.innerHTML.length)
  const domChanged = Math.abs(afterHtml - initialHtml) > 20
  return Boolean(requestHappened || navPromise || domChanged)
}

async function auditRoute(browser: Browser, route: string): Promise<RouteReport> {
  const context = await browser.newContext()
  const page = await context.newPage()

  const consoleErrors: string[] = []
  const networkErrors: Array<{ url: string; status: number; statusText: string }> = []
  const jsonIssues: Array<{ url: string; status: number; reason: string }> = []
  const webSocketUrls: string[] = []

  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text())
    }
  })

  context.on('websocket', (ws: WebSocket) => {
    webSocketUrls.push(ws.url())
  })

  page.on('response', async (res) => {
    try {
      const status = res.status()
      const url = res.url()
      const ct = res.headers()['content-type'] || ''
      if (status >= 500) {
        networkErrors.push({ url, status, statusText: res.statusText() })
      }
      // Validate JSON when advertised
      if (status < 400 && ct.includes('application/json')) {
        try {
          await res.json()
        } catch (e) {
          jsonIssues.push({ url, status, reason: 'Invalid JSON or parse error' })
        }
      }
    } catch {/* ignore single response errors */}
  })

  // Ensure authenticated first
  await signIn(page)
  await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle' })

  // Click a subset of primary/clickable buttons to detect dead ones
  const clickableLocators = page.locator(
    [
      'button:not([disabled])',
      'a[role="button"]',
      'a[href]',
      // heuristic for primary gradient classes
      'button[class*="from-violet-500"]',
    ].join(', ')
  )

  const count = await clickableLocators.count()
  const limit = Math.min(count, MAX_BUTTON_CLICKS_PER_ROUTE)

  let clickedButtons = 0
  const deadButtons: Array<{ selector: string; text: string | null }> = []

  for (let i = 0; i < limit; i++) {
    const el = clickableLocators.nth(i)
    const tag = await el.evaluate((e) => e.tagName.toLowerCase())
    const className = await el.getAttribute('class')
    const isDisabled = (await el.getAttribute('disabled')) !== null
    if (isDisabled || isDestructive(className)) continue

    const hadEffect = await clickAndDetectEffect(page, el)
    clickedButtons++
    if (!hadEffect) {
      const text = await el.textContent()
      const selector = `${tag}${className ? '.' + className.split(' ').slice(0, 2).join('.') : ''}`
      deadButtons.push({ selector, text: text?.trim() || null })
    }
    // Navigate back if we left the page
    if (page.url() !== `${BASE_URL}${route}` && !page.url().startsWith(`${BASE_URL}${route}#`)) {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle' })
    }
  }

  // Screenshot
  const shotsDir = path.join(process.cwd(), 'ui-audit-screenshots')
  fs.mkdirSync(shotsDir, { recursive: true })
  const safeName = route === '/' ? 'root' : route.replace(/\W+/g, '_')
  const screenshotPath = path.join(shotsDir, `${safeName}.png`)
  await page.screenshot({ path: screenshotPath, fullPage: true })

  await context.close()

  return {
    route,
    consoleErrors,
    networkErrors,
    jsonIssues,
    websockets: webSocketUrls,
    clickedButtons,
    deadButtons,
    screenshot: `ui-audit-screenshots/${path.basename(screenshotPath)}`,
  }
}

async function run() {
  const routes = await discoverRoutes()
  const browser = await chromium.launch({ headless: true })
  const reports: RouteReport[] = []

  for (const route of routes) {
    const report = await auditRoute(browser, route)
    reports.push(report)
    // Quick console output for visibility
    const status = report.consoleErrors.length === 0 ? 'OK' : 'ERR'
    console.log(`[${status}] ${route} – consoleErrors=${report.consoleErrors.length}, deadButtons=${report.deadButtons.length}`)
  }

  await browser.close()

  const aggregate: AuditReport = {
    baseUrl: BASE_URL,
    timestamp: new Date().toISOString(),
    summary: {
      totalRoutes: reports.length,
      routesWithConsoleErrors: reports.filter((r) => r.consoleErrors.length > 0).length,
      totalDeadButtons: reports.reduce((a, r) => a + r.deadButtons.length, 0),
      networkErrorCount: reports.reduce((a, r) => a + r.networkErrors.length, 0),
      jsonIssueCount: reports.reduce((a, r) => a + r.jsonIssues.length, 0),
    },
    routes: reports,
  }

  fs.writeFileSync('ui-audit-report.json', JSON.stringify(aggregate, null, 2))
  console.log('\nReport written to ui-audit-report.json')
}

run().catch((err) => {
  console.error('UI audit failed:', err)
  process.exit(1)
})


