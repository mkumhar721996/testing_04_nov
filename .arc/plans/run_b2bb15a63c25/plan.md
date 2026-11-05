summary: |
  Give a signed-in user a Dashboard landing screen in the Web App (apps/web): a top bar with the main nav (Dashboard active; Loans, Deposits, Documents, Reports disabled with a "Coming soon" badge), and a hero with a personalised greeting, disabled Deposit and Withdraw buttons ("Coming soon"), and a card visual showing only the last four digits, the MM/YY expiry and the account balance. The card and balance section loads on its own (skeleton), fails to an in-place "Card and balance unavailable" panel with a "Try again" button, and retry re-fetches only that section. Neither the Web App nor the Core API has any user, card, balance or auth code yet (only /health), so the plan also adds the Core API read endpoints and the PostgreSQL tables behind the screen, rather than shipping the design's sample data (Nixtio, 9286, 08/32, $12,680.42). The grids below the hero are excluded.
scope:
  - description: |
      Load the design system once in the Web App. `apps/web/src/index.css` currently holds only `@import 'tailwindcss';` and nothing loads `design-system/tokens.css`. Add imports of `../../../design-system/tokens.css` and `../../../design-system/prototype-utils.css` (they define `.btn`, `.btn-secondary`, `.btn-ghost`, `.btn-primary`, `.chip`, `.badge`, `.alert`, `.avatar`, `.skeleton`, `.stack`, `.cluster`). Imports go before any other rule. Verify Vite resolves the path outside the app root (add `server.fs.allow` in vite.config.ts if the dev server refuses it).
    files:
      - apps/web/src/index.css
      - apps/web/vite.config.ts
    rationale: |
      The prototype's classes come from these two files, so the production code must load the same sheets instead of redefining them.
  - description: |
      Dashboard-specific styles on tokens only, ported from the prototype's own `<style>` block (classes `.topbar`, `.topbar-inner`, `.logo`, `.main-nav`, `.top-actions`, `.hero`, `.hero-inner`, `.hero-title`, `.card-slot`, `.card-visual`, `.card-row`, `.card-balance`, `.card-growth`, `.card-panel`, `.wrap`, `.soon`). Tokens used: --color-surface, --color-border, --border-width, --shell-header-height, --space-1..5, --content-max-width, --touch-target-min, --font-size-lg, --font-size-xl, --font-weight-bold, --color-warning-bg (hero), --color-fg, --color-overlay and --color-on-primary (card visual fill and text), --radius-lg, --shadow-md, --color-success-bg and --color-success (growth badge, only if growth data exists, see open questions), --color-bg-subtle and --color-fg-muted (panel), --opacity-disabled. Breakpoints are copied from the prototype: nav wraps below 900px, hero is two columns from 768px. No hex or px literals where a token exists. The prototype's `min(360px, 100%)` card-slot width and `200px` min-height have no token; they are listed in the open questions.
    files:
      - apps/web/src/features/dashboard/dashboard.css
      - apps/web/src/index.css
    rationale: |
      The prototype defines these classes inline, not in design-system/, so they are defined in the app on the same tokens.
  - description: |
      Core API data layer (PostgreSQL via the existing global `PG_POOL` in `services/api/src/database/database.module.ts`). Add a migration creating `accounts` (id, owner_subject text not null unique, display_name text not null, balance_minor bigint not null, currency char(3) not null) and `cards` (id, account_id fk, number_last4 char(4) not null, expiry_month smallint, expiry_year smallint). Store only the last four digits, never a full card number (AC 3). Add a `DashboardModule` with `DashboardService` and `DashboardController`:
      ```ts
      @Controller('me')
      export class DashboardController {
        @Get()                 profile(@CurrentUser() u: AuthUser): Promise<{ name: string }>
        @Get('card-summary')   cardSummary(@CurrentUser() u: AuthUser): Promise<CardSummaryDto>
      }
      type CardSummaryDto = { last4: string; expiry: string /* MM/YY */; balance: { amount: string; currency: string } }
      ```
      Two endpoints so the greeting and shell never depend on the card query, which is what lets "Try again" reload only the card section (AC 14-16). The service formats expiry as `MM/YY` (zero-padded month, two-digit year) and returns 404 for a user with no card or account. Register `DashboardModule` in `services/api/src/app.module.ts`. Add `services/api/src/dashboard/auth-user.ts` with the `AuthUser` type and a `CurrentUser` param decorator that reads the user verified by the authentication layer (see open questions).
    files:
      - services/api/src/app.module.ts
      - services/api/src/dashboard/dashboard.module.ts
      - services/api/src/dashboard/dashboard.controller.ts
      - services/api/src/dashboard/dashboard.service.ts
      - services/api/src/dashboard/dashboard.dto.ts
      - services/api/src/dashboard/auth-user.ts
      - services/api/src/dashboard/dashboard.service.spec.ts
      - services/api/src/dashboard/dashboard.controller.spec.ts
      - services/api/test/e2e/dashboard.spec.ts
      - services/api/migrations/001_accounts_and_cards.sql
    rationale: |
      The screen needs per-user name, masked card and balance and none of it exists; the Web App calls the Core API only (stack notes).
  - description: |
      Web App data access. `apps/web/src/features/dashboard/api.ts` exports `fetchProfile(): Promise<{ name: string }>` and `fetchCardSummary(): Promise<CardSummary>`, both calling the Core API with the signed-in user's bearer token and throwing on a non-2xx. Hooks `useProfile()` and `useCardSummary()` return `{ status: 'loading' | 'ready' | 'error', data, reload }`. `useCardSummary().reload` re-runs only the card-summary request (AC 16). No new package: plain `fetch` and React state.
    files:
      - apps/web/src/features/dashboard/api.ts
      - apps/web/src/features/dashboard/useCardSummary.ts
      - apps/web/src/features/dashboard/useProfile.ts
      - apps/web/src/features/dashboard/types.ts
    rationale: |
      Keeps network state out of the presentational components so each section can be tested with a stubbed fetch.
  - description: |
      Dashboard components built from the prototype's "Dashboard" screen. `TopBar` (`header.topbar`, logo "Harbor Bank", `MainNav`, top-actions with the notification button and avatar showing initials). `MainNav` (`nav aria-label="Main"`): Dashboard as a selected `.chip` with `aria-current="page"`; Loans, Deposits, Documents, Reports as `.btn .btn-ghost` with `aria-disabled="true"`, each containing `<span class="badge soon">Coming soon</span>`, with a click handler that calls `preventDefault()` and does nothing else (AC 7, 10, 11); they stay focusable, as in the prototype. `Hero` (`section.hero` labelled by the h1): tagline, `<h1>Welcome back, {name}!</h1>`, a cluster with Deposit and Withdraw (`.btn .btn-secondary`, `aria-disabled="true"`, "Coming soon" badge, no handler that starts an action, AC 8, 12, 13), and the card slot (`aria-live="polite"`). `CardSection` renders one of three states: loading (`.card-panel` with four `.skeleton` bars, `role="status"`, label "Loading card and balance"), ready (`CardVisual`), error (`.card-panel role="alert"` with h2 "Card and balance unavailable", the prototype's explanatory sentence, and `<button class="btn btn-primary">Try again</button>`). `CardVisual` (`role="group" aria-label="Your card"`): "•••• {last4}" with `aria-label="Card ending in {last4}"`, "Expires {MM/YY}", the account balance formatted with `Intl.NumberFormat(undefined, { style: 'currency', currency })`, and the label "Account balance". Replace the placeholder `App.tsx` heading with `<Dashboard/>` (TopBar plus `main` containing Hero). The grids below the hero (overview, transactions, spend, investment) and the prototype's empty and section-unavailable states are not built.
    files:
      - apps/web/src/App.tsx
      - apps/web/src/features/dashboard/Dashboard.tsx
      - apps/web/src/features/dashboard/TopBar.tsx
      - apps/web/src/features/dashboard/MainNav.tsx
      - apps/web/src/features/dashboard/Hero.tsx
      - apps/web/src/features/dashboard/CardSection.tsx
      - apps/web/src/features/dashboard/CardVisual.tsx
    rationale: |
      One component per prototype region keeps each acceptance criterion testable in isolation.
  - description: |
      Development-only sample data (decision: mock data for development, real API before release). Add `services/api/seeds/dev-dashboard.sql`, an idempotent script (`INSERT ... ON CONFLICT DO NOTHING`) that inserts one sample account and card (name, last four, expiry, balance). It is applied by hand to a local database, is never referenced by the migration, the Dockerfile or any deploy step, and starts with a comment saying so. The API and the Web App always use the real endpoints; there is no mock mode in production code and no fixture in the bundle.
    files:
      - services/api/seeds/dev-dashboard.sql
    rationale: |
      Lets developers see the screen locally without putting invented data into shipped code.
  - description: |
      Observability on the Core API (decision: CloudWatch + OpenTelemetry). Add `services/api/src/telemetry.ts`, which starts the OpenTelemetry Node SDK with an OTLP/HTTP trace exporter and HTTP and NestJS auto-instrumentation, only when `OTEL_EXPORTER_OTLP_ENDPOINT` is set (a no-op when unset, so local runs and tests are unaffected). `main.ts` imports it first, before `AppModule`. The OTLP endpoint is an AWS Distro for OpenTelemetry collector, which forwards traces to X-Ray and logs to CloudWatch; the collector is infrastructure outside this repo. `DashboardService` catches a failed card query, logs it with the Nest `Logger` as one line without card data (`card-summary failed userRef=<hash> reason=<error name>`), and rethrows so the endpoint returns 500. Logs go to stdout, which the AWS container log driver ships to CloudWatch Logs. Spans are named by route, so a failing `/me/card-summary` is visible separately from `/me`.
    files:
      - services/api/src/telemetry.ts
      - services/api/src/telemetry.spec.ts
      - services/api/src/main.ts
    rationale: |
      Gives the section-failure observability the deferred epic question asked for, without adding anything to the Web App.
  - description: |
      Update the existing smoke tests that assert the placeholder heading "Web App" (`apps/web/src/App.test.tsx` and `apps/web/e2e/app.spec.ts`) so they check the Dashboard (the "Welcome back" heading) instead. Add a Playwright e2e that route-mocks the Core API for the failure and retry path.
    files:
      - apps/web/src/App.test.tsx
      - apps/web/e2e/app.spec.ts
      - apps/web/e2e/dashboard.spec.ts
    rationale: |
      The placeholder is replaced, so the old assertions would fail.
tests:
  - |
    AC1 (apps/web/src/App.test.tsx, vitest + RTL, fetch stubbed): App renders the Dashboard for a signed-in user.
    `render(<App />); expect(await screen.findByRole('heading', { level: 1, name: /welcome back/i })).toBeInTheDocument();`
    Playwright: `await page.goto('/'); await expect(page.getByRole('heading', { level: 1 })).toContainText('Welcome back');`
  - |
    AC2 (Hero.test.tsx): `render(<Hero name="Ada" card={...} />); expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Welcome back, Ada!');` Also `useProfile` test: the name from `GET /me` reaches the heading.
  - |
    AC3 (CardVisual.test.tsx, plus API service spec): `render(<CardVisual last4="9286" ... />); expect(screen.getByLabelText('Card ending in 9286')).toHaveTextContent('•••• 9286'); expect(container.textContent).not.toMatch(/\d{5,}/);`
    API: `expect(JSON.stringify(await service.cardSummary(user))).not.toMatch(/\d{5,}/)` (only `last4` is ever selected), and the e2e asserts `Object.keys(body)` equals `['last4','expiry','balance']`.
  - |
    AC4 (CardVisual.test.tsx): `expect(screen.getByText('$12,680.42')).toBeInTheDocument()` given `balance={{ amount: '12680.42', currency: 'USD' }}`, inside the hero. API service spec: `bigint` minor units 1268042 with `USD` returns `{ amount: '12680.42', currency: 'USD' }`.
  - |
    AC5 (TopBar.test.tsx): `expect(screen.getByRole('banner')).toBeInTheDocument();`
  - |
    AC6 (MainNav.test.tsx): `expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');`
  - |
    AC7 (MainNav.test.tsx): for each of Loans, Deposits, Documents, Reports, `await user.click(screen.getByRole('button', { name: new RegExp(label) }))`, then `expect(window.location.pathname).toBe('/')` and `expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()`. Playwright repeats it with `expect(page).toHaveURL('/')`.
  - |
    AC8 (Hero.test.tsx): with a `fetch` spy, click Deposit and Withdraw: `expect(fetchSpy).not.toHaveBeenCalledWith(expect.stringMatching(/deposit|withdraw/i), expect.anything()); expect(onAction).not.toHaveBeenCalled();` and no dialog opens: `expect(screen.queryByRole('dialog')).toBeNull();`
  - |
    AC9 (API service spec and CardVisual.test.tsx): `expect(formatExpiry({ month: 8, year: 2032 })).toBe('08/32')` and `expect(screen.getByText('08/32')).toBeInTheDocument()`; month 11 year 2030 gives `'11/30'`.
  - |
    AC10 (MainNav.test.tsx): `for (const l of ['Loans','Deposits','Documents','Reports']) expect(screen.getByRole('button', { name: new RegExp(l) })).toHaveAttribute('aria-disabled', 'true');`
  - |
    AC11 (MainNav.test.tsx): `expect(within(screen.getByRole('button', { name: /Loans/ })).getByText('Coming soon')).toBeInTheDocument();` repeated for each of the four items.
  - |
    AC12 (Hero.test.tsx): `expect(screen.getByRole('button', { name: /^Deposit/ })).toHaveAttribute('aria-disabled', 'true'); expect(screen.getByRole('button', { name: /^Withdraw/ })).toHaveAttribute('aria-disabled', 'true');`
  - |
    AC13 (Hero.test.tsx): `expect(within(screen.getByRole('button', { name: /^Deposit/ })).getByText('Coming soon')).toBeInTheDocument();` and the same for Withdraw.
  - |
    AC14 (CardSection.test.tsx, fetch rejecting): `expect(await screen.findByRole('alert')).toHaveTextContent(/card and balance unavailable/i);` The greeting and top bar stay rendered.
  - |
    AC15 (CardSection.test.tsx): `expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument();`
  - |
    AC16 (Dashboard.test.tsx and Playwright dashboard.spec.ts): the first card-summary call fails and the second succeeds.
    `await user.click(screen.getByRole('button', { name: 'Try again' })); expect(await screen.findByLabelText('Card ending in 9286')).toBeInTheDocument(); expect(fetchMock.mock.calls.filter(c => c[0].endsWith('/me/card-summary'))).toHaveLength(2); expect(fetchMock.mock.calls.filter(c => c[0].endsWith('/me'))).toHaveLength(1);`
    Also assert a loading skeleton shows (`getByRole('status', { name: /loading card and balance/i })`) between the click and the response.
  - |
    API e2e (services/api/test/e2e/dashboard.spec.ts, Playwright request testing against a seeded DB): an authenticated user with an account and card gets 200 from `/me` and `/me/card-summary`; a user with no card gets 404 from `/me/card-summary` while `/me` still returns 200; a request with no verified user gets 401.
  - |
    Performance targets (API e2e and Playwright). API: `const t = Date.now(); const res = await request.get('/me/card-summary'); expect(Date.now() - t).toBeLessThan(500);` against the seeded local database. Web: after `page.goto('/')`, `expect(await page.evaluate(() => performance.getEntriesByType('navigation')[0].duration)).toBeLessThan(3000);` with the API route-mocked, on the production preview build. Both are goals checked on a developer machine; the real standard-broadband figure is measured in the deployed environment.
  - |
    Telemetry (services/api/src/telemetry.spec.ts): `delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT; expect(startTelemetry()).toBeNull();` and, with the variable set to `http://localhost:4318`, `expect(startTelemetry()).not.toBeNull()`. Service spec: when the pool query rejects, `expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('card-summary failed'))` and `expect(loggerSpy.mock.calls.join('')).not.toContain('9286')` (the seeded last four never appear in the log), and the promise still rejects.
  - |
    Migration test: applying `001_accounts_and_cards.sql` twice (re-run) leaves data intact, and the service still reads a row inserted before a second apply. Constraint test: a `number_last4` that is not 4 digits is rejected.
assumptions_or_open_questions:
  - |
    DECIDED, with a dependency: this story depends on the existing Microsoft Entra ID story for sign-in and token validation, and does not build it. No auth code exists in the repo today (a search of services/ for auth, jwt, entra and migration found nothing). This item only reads the verified user (subject and display name) through `CurrentUser`; tests override the guard. Implementation cannot be merged or released until the Entra ID story has landed, so please confirm its work item and that it exposes the user's subject and name to controllers.
  - |
    Where the greeting name comes from: the plan assumes `accounts.display_name` (or the token's name claim). Please confirm which is authoritative.
  - |
    DECIDED: mock data for development, a real source before release. Development uses the dev-only seed script `services/api/seeds/dev-dashboard.sql`; production code has no mock path. STILL OPEN: nothing writes real accounts and cards yet, so on a deployment every user sees "Card and balance unavailable" (404) until a real source (import or core banking integration) exists. That source is outside this story and is a release blocker, so please name its owner or story.
  - |
    DECIDED: the prototype's growth badge ("Increasing 2.46% this month") and brand label ("VISA") are out of scope; the plan does not build them or their tokens.
  - |
    The prototype's top bar has a notifications button and an account avatar with "not available yet" toasts. No AC covers them. The plan renders them as inert controls (avatar shows initials from the name) and adds no toast. Confirm, or drop them.
  - |
    DECIDED: the prototype's top-bar navigation is the source of truth. The UI guidelines specify a top bar plus left sidebar with sections Dashboard, Items, Activity, Settings; this story is a documented exception, because the approved prototype and the ACs use a horizontal nav (Dashboard, Loans, Deposits, Documents, Reports).
  - |
    Prototype deviations from the guidelines: the page background is a mixed warning tint (`color-mix` over `--color-warning`) and the hero uses `--color-warning-bg`; the guidelines say `color-bg` is the page. The plan follows the prototype for the hero but uses `--color-bg` for the page, unless the reviewer wants the tint kept.
  - |
    DECIDED: temporary local tokens, plus a design-system defect raised. `dashboard.css` declares named custom properties scoped to the dashboard (`--dashboard-card-slot-width: min(360px, 100%)`, `--dashboard-card-slot-min-height: 200px`, `--dashboard-nav-breakpoint` documented in a comment, since a custom property cannot be used inside a media query, so the 900px value stays a single commented literal). Each carries a comment pointing at the design-system defect. Raise a defect to add card-slot tokens and a nav breakpoint, and to fix `--duration-fast` and `--duration-spin` in `design-system/tokens.css` lines 75-76 (both are `[object Object]`, invalid CSS, so transitions and the skeleton pulse do not animate). The defect is raised outside this repo; this story does not edit design-system/.
  - |
    DECIDED: performance targets are under 3 seconds page load and under 500 ms API response, checked by the tests listed. The "standard broadband" load figure is only measurable in a deployed environment, so please say who verifies it before release. Availability stays with the existing 99.5% target (ADR-0008); this story adds nothing for it.
  - |
    DECIDED: monitoring is CloudWatch plus OpenTelemetry on the Core API only (traces by OTLP to an AWS Distro for OpenTelemetry collector, then X-Ray; logs to CloudWatch via stdout). NOT in this repo and needed before it works: the collector, its IAM role, the log group and the `OTEL_EXPORTER_OTLP_ENDPOINT` value in the API's deployment (ADR-0009 AWS containers). Web App monitoring (browser RUM) is not planned. The OpenTelemetry package versions below were chosen from memory of the 0.200 release line and must be confirmed against the registry at install time.
  - |
    API base URL for the Web App: `apps/web/.env.local` holds `ARC_API_URL` and `VITE_ARC_MOCK`, neither of which this app uses. The plan reads `import.meta.env.VITE_API_URL` and defaults to same-origin `/api` through a Vite dev and preview proxy. Confirm, as this needs a new env var documented in `apps/web/.env.example`.
  - |
    Currency: stored per account (`currency char(3)`) and formatted with `Intl.NumberFormat`; no project default currency was found. Confirm per-account currency.
  - |
    Migration tooling: services/api has no migration runner (only a raw `pg` Pool). The plan adds a plain SQL file applied with `psql`. Confirm, or pick a tool as a separate decision.
estimated_points: 8
package_dependencies:
  - name: "@opentelemetry/api"
    version: "^1.9.0"
    ecosystem: npm
    rationale: Lets the API create and read spans.
    component_id: comp_core_api
  - name: "@opentelemetry/sdk-node"
    version: "^0.200.0"
    ecosystem: npm
    rationale: Starts tracing for the Core API in telemetry.ts.
    component_id: comp_core_api
  - name: "@opentelemetry/exporter-trace-otlp-http"
    version: "^0.200.0"
    ecosystem: npm
    rationale: Sends traces by OTLP to the AWS Distro for OpenTelemetry collector (CloudWatch and X-Ray).
    component_id: comp_core_api
  - name: "@opentelemetry/auto-instrumentations-node"
    version: "^0.58.0"
    ecosystem: npm
    rationale: Traces the HTTP server and the NestJS and pg calls without hand-written spans.
    component_id: comp_core_api
notes: |
  ### Data & rollout

  - **Existing data**: new tables only (`accounts`, `cards`); no existing table or row is altered. `001_accounts_and_cards.sql` uses `CREATE TABLE IF NOT EXISTS`, so re-running it is safe.
  - **Backfill / seed**: no backfill. `services/api/seeds/dev-dashboard.sql` is a development-only, idempotent seed (safe to re-run), applied by hand locally. Until real accounts and cards are provisioned, deployed users see the section's error state (open question above).
  - **Settings**: `VITE_API_URL` (Web App, default same-origin `/api`, documented in `apps/web/.env.example`); the existing `DATABASE_URL` for the API (default in `database.module.ts`); `OTEL_EXPORTER_OTLP_ENDPOINT` for the API (default unset, which turns tracing off; documented in `services/api/.env.example`).
  - **Provisioning**: the two tables; the verified-user mechanism from the Entra ID story; a real account and card data source before release; the ADOT collector, its IAM role and the CloudWatch log group. The dev seed is not provisioning and is never run in a deployed environment.
  - **Order and rollback**: apply the migration, deploy the API, then the Web App. Rollback: redeploy the previous Web App, then drop the two tables (nothing else references them).

  ### Design-system loading
  Today `apps/web/src/index.css:1` is `@import 'tailwindcss';` and `apps/web/src/main.tsx:3` imports it; the tokens are not loaded. The plan adds the two design-system imports there once (see scope). Tailwind (the confirmed styling choice) stays in the pipeline, but the prototype's classes come from `design-system/prototype-utils.css`, so this item uses those classes and the tokens.

  ### Prototype elements the plan follows
  Top bar with logo, main nav and top-actions; hero with tagline, h1 "Welcome back, name!", disabled Deposit and Withdraw with "Coming soon" badge; card slot `aria-live="polite"` with default (`.card-visual`), loading (`.card-panel` with four `.skeleton` bars) and error (`.card-panel role="alert"`, h2 "Card and balance unavailable", `.btn-primary` "Try again") states. Placeholder nav items use `aria-disabled` rather than `disabled`, so they stay focusable and screen readers read "Coming soon". The prototype shows an in-page "section coming soon" notice when a placeholder is activated; AC 7 only requires that no destination opens, so the notice is not built.

  ```mermaid
  flowchart TD
    main[apps/web/src/main.tsx] --> css[index.css: load design-system tokens]
    main --> App[App.tsx: render Dashboard]
    App --> Dash[features/dashboard components]
    Dash --> Hooks[useProfile and useCardSummary]
    Hooks -->|GET /me, GET /me/card-summary| Ctl[api dashboard.controller.ts]
    Ctl --> Svc[dashboard.service.ts]
    Svc --> Pool[database.module.ts PG_POOL]
    Mod[app.module.ts] --> DM[dashboard.module.ts]
    DM --> Ctl
    classDef touched fill:#f96,color:#000
    class css,App,Dash,Hooks,Ctl,Svc,DM,Mod touched
  ```
review_focus: |
  IN: the Dashboard shell, hero and card section in the Web App; the Core API read endpoints and tables behind them; a development-only seed script; and OpenTelemetry tracing and failure logging on the API (off unless the endpoint variable is set). OUT: the grids below the hero, any working nav destination, deposit or withdrawal, sign-in (depends on the Entra ID story), the growth badge and VISA label, collector and CloudWatch infrastructure, browser monitoring, and any production data source. Riskiest: a card endpoint that must never return or log more than the last four digits, retry reloading only the card section, and the OpenTelemetry versions, which must be confirmed at install. Deliberate: `aria-disabled` (focusable) rather than `disabled`, the prototype's top-bar nav over the guidelines' sidebar, and local dashboard tokens until the design-system defect is fixed.
