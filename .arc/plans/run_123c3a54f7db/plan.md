summary: |
  Give a signed-in buyer one private cart that lists lines from every SAP instance, with change-quantity and remove. This needs a real backend: a `cart_lines` table (migration 002), a Nest `CartModule` in `services/api` (GET /cart, PATCH /cart/lines/:id, DELETE /cart/lines/:id) that scopes every query to the calling user, and a `CartPage` in `apps/web` that replaces the "Cart is not available yet" placeholder in `App.tsx`. A quantity above the stock shown is refused (settled decision) and the shown stock is returned and displayed; zero or non-numeric input is refused with a visible error; in both cases the stored quantity does not change. No price, no Ship To, no Place order. Built test-first, API layers first, then the UI against the approved prototype.
scope:
  - description: |
      Migration `002_cart_lines.sql` (idempotent, same style as `001_*.sql`):
      ```sql
      CREATE TABLE IF NOT EXISTS cart_lines (
        id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_id     text    NOT NULL,
        part_number  text    NOT NULL,
        description  text    NOT NULL,
        sap_instance text    NOT NULL,
        stock_shown  integer NOT NULL CHECK (stock_shown >= 0),
        quantity     integer NOT NULL CHECK (quantity >= 1),
        created_at   timestamptz NOT NULL DEFAULT now(),
        UNIQUE (owner_id, sap_instance, part_number)
      );
      CREATE INDEX IF NOT EXISTS cart_lines_owner_idx ON cart_lines (owner_id, created_at, id);
      ```
      There is deliberately no price or ship-to column. `stock_shown` is the stock snapshot the buyer was shown when the part was added (the Parts Service is not in this repo; see open questions).
    files:
      - services/api/migrations/002_cart_lines.sql
    rationale: |
      The cart must persist per user across sessions and devices; the API owns the shared PostgreSQL (ADR-0002/0003). Migrations are applied by `src/database/migrate.ts` in name order.
  - description: |
      Cart domain service and repository port, mirroring `defects/` (repository interface + `Pg…` + `InMemory…` for unit tests).
      ```ts
      // cart.repository.ts
      export interface CartLineRecord { id: string; partNumber: string; description: string; sapInstance: string; stockShown: number; quantity: number }
      export interface CartRepository {
        listByOwner(ownerId: string): Promise<CartLineRecord[]>;
        findOwned(ownerId: string, lineId: string): Promise<CartLineRecord | null>;
        setQuantity(ownerId: string, lineId: string, quantity: number): Promise<CartLineRecord | null>;
        remove(ownerId: string, lineId: string): Promise<boolean>;
        add(ownerId: string, line: Omit<CartLineRecord, 'id'>): Promise<CartLineRecord>; // used by tests and the future add-to-cart story
      }
      export const CART_REPOSITORY = 'CART_REPOSITORY';

      // cart.service.ts
      export type ChangeQuantityResult =
        | { kind: 'ok'; line: CartLineRecord }
        | { kind: 'invalid' }
        | { kind: 'over-stock'; stock: number; quantity: number }
        | { kind: 'not-found' };
      class CartService {
        list(ownerId: string): Promise<CartLineRecord[]>;
        changeQuantity(ownerId: string, lineId: string, quantity: unknown): Promise<ChangeQuantityResult>;
        remove(ownerId: string, lineId: string): Promise<boolean>;
      }
      ```
      Rules: quantity must be `Number.isInteger(q) && q >= 1` else `invalid`; `q > stockShown` is `over-stock` and nothing is written; every query is `WHERE owner_id = $1`, and a line owned by someone else is `not-found` (same as a missing one, so ids cannot be probed). `PgCartRepository` uses `PG_POOL` and the UUID guard pattern from `pg-defect.repository.ts`.
    files:
      - services/api/src/cart/cart.repository.ts
      - services/api/src/cart/cart.service.ts
      - services/api/src/cart/in-memory-cart.repository.ts
      - services/api/src/cart/pg-cart.repository.ts
      - services/api/src/cart/cart.service.spec.ts
    rationale: |
      Business rules (stock cap, validation, ownership) live in one unit-testable service with no HTTP or SQL in it, the same split as `StatusMoveService`.
  - description: |
      HTTP surface, guarded by the existing `ActorGuard` and read via `@CurrentActor()` (the owner is `actor.id`, never a header or body field):
      - `GET /cart` → `200 { lines: CartLineDto[] }` (`id, partNumber, description, sapInstance, stockShown, quantity` only; no price/shipTo keys).
      - `PATCH /cart/lines/:id` body `{ quantity }` → `200 CartLineDto`; `400 { message }` for zero / non-integer / non-numeric; `409 { message, stock }` when above stock shown; `404` when not the caller's line.
      - `DELETE /cart/lines/:id` → `204`; `404` when not the caller's line.
      `CartModule` is added to `AppModule.imports`.
    files:
      - services/api/src/cart/cart.controller.ts
      - services/api/src/cart/cart.module.ts
      - services/api/src/cart/cart.controller.spec.ts
      - services/api/src/app.module.ts
    rationale: |
      Same wiring as `DefectsModule`/`DefectsController`. `ActorGuard` is the only identity mechanism with a working path today (`AUTH_DEV_ACTOR=true`); when the Entra ID validation story replaces it, the cart follows because it only reads `actor.id`.
  - description: |
      Web API client `apps/web/src/api/cart.ts`, same shape as `api/defects.ts` (uses `apiFetch`, `VITE_API_BASE_URL`):
      ```ts
      export interface CartLine { id: string; partNumber: string; description: string; sapInstance: string; stockShown: number; quantity: number }
      export type ChangeResult =
        | { kind: 'ok'; line: CartLine }
        | { kind: 'over-stock'; stock: number }
        | { kind: 'invalid'; message: string }
        | { kind: 'error' };
      export function getCart(): Promise<CartLine[]>;            // throws on non-2xx
      export function changeQuantity(id: string, quantity: number): Promise<ChangeResult>;
      export function removeLine(id: string): Promise<boolean>;
      ```
    files:
      - apps/web/src/api/cart.ts
      - apps/web/src/api/cart.test.ts
    rationale: |
      Keeps fetch and status-code mapping out of the component; 409 maps to `over-stock` so the UI can show the stock the server returned.
  - description: |
      `CartPage` (new `apps/web/src/features/cart/CartPage.tsx`) plus a small pure helper `parseQuantity(raw: string): number | null` (`/^\d+$/` and `>= 1`, else null) in `quantity.ts`. Renders inside the existing `AppShell` (reused, not rebuilt). Layout taken from the prototype's Cart screen:
      - Header row `.cart-head`: `h1` "My cart" (`text-lg`) and a line count ("2 lines" / "1 line" / "0 lines"); a `.text-muted` note "Only you can see this cart. It holds parts from every SAP instance you buy from."
      - One `ul.card.cart-list` ("Cart lines"); each `li.cart-line` has `.cart-info.stack-sm` with the part number (`strong.cart-part`, mono), description, and a `.cluster` of `.badge` (SAP instance, e.g. "SAP A (EU)") and `.badge.badge-success` ("In stock: 24"); and a `form.qty-form` with `label.qty-label` "Qty" + `input.input.qty-input` (text, `inputmode="numeric"`, `aria-label="Qty for <part>"`), `.btn.btn-secondary.btn-sm` "Update" and `.btn.btn-ghost.btn-sm` "Remove" with trash icon and `aria-label="Remove <part>"`.
      - States from the prototype: loading = `.card` with two `.skeleton.skeleton-row` and `role="status"`; error = `.alert.alert-danger` "We couldn’t load your cart." / "Your lines are safe. Check your connection and try again." with a "Try again" `.btn-secondary.btn-sm`; empty = `.empty-state` "Your cart is empty" / "Parts you add from search appear here, from every SAP instance." with one `.btn-primary` "Search parts" (calls `onNavigate('search')`); quantity changed = `.alert.alert-success role="status"` "Cart updated."; over stock = `.alert.alert-danger role="alert"` "Only {stock} in stock for {part}. Quantity kept at {quantity}." and the input is reset to the kept quantity; invalid = input gets `.is-invalid` + `aria-invalid`, `span.field-error.qty-error role="alert"` "Enter a whole number greater than 0. Quantity stays at {quantity}." linked by `aria-describedby`; removal = `.alert.alert-info role="status"` "{description} removed from your cart." (no Undo; see open questions).
      - Client check runs first: `parseQuantity` null → show the invalid error and do not call the API; a value above `stockShown` is still sent to the server, which is the authority, and the 409 body drives the message.
      Wire it in `App.tsx`: `else if (section === 'cart') content = <CartPage onSearch={() => setSection('search')} />` replacing `<Placeholder title="Cart" />`. The nav already lists Cart for buyer and admin (`features/auth/nav.ts`), so no nav change; csr has no Cart entry and gets none.
    files:
      - apps/web/src/features/cart/CartPage.tsx
      - apps/web/src/features/cart/quantity.ts
      - apps/web/src/features/cart/CartPage.test.tsx
      - apps/web/src/features/cart/quantity.test.ts
      - apps/web/src/App.tsx
    rationale: |
      Delivers every state in the approved prototype using the design system's existing classes. Server stays authoritative for stock and ownership; the client check only avoids a pointless round trip for blank/zero/non-numeric input.
  - description: |
      Cart styles, `apps/web/src/styles/cart.css`, imported once in `apps/web/src/index.css` next to `./styles/defect.css` and `./styles/auth.css`. It defines only the prototype's new `CartLineList` rules (`.cart-head`, `.cart-list`, `.cart-line`, `.cart-info`, `.cart-part`, `.qty-form`, `.qty-label`, `.qty-input`, `.qty-error`, `.skeleton-row`), copied from the prototype's inline `<style>` and using tokens only: `--space-2`, `--space-3`, `--space-6`, `--border-width`, `--color-border`, `--font-family-mono`, `--font-weight-medium`, `--grid-min-col`, `--control-height-lg`, `--space-4`, `--touch-target-min`. No colour or pixel literals.
    files:
      - apps/web/src/styles/cart.css
      - apps/web/src/index.css
    rationale: |
      Tokens and the standard components (`.btn*`, `.card`, `.badge*`, `.alert*`, `.input`, `.field-error`, `.empty-state`, `.skeleton`, `.stack*`, `.cluster`) already load via `index.css` lines 1-2 (`design-system/tokens.css`, `design-system/prototype-utils.css`) and I confirmed each is defined in `prototype-utils.css`. Only the cart-specific layout classes have no definition anywhere, so those go in one new stylesheet.
  - description: |
      End-to-end tests. API Playwright spec runs against real Postgres with `AUTH_DEV_ACTOR=true`, seeding rows through `PgCartRepository.add`. Web Playwright spec stubs the Core API at the network edge, like `e2e/defect-status.spec.ts`.
    files:
      - services/api/test/e2e/cart.spec.ts
      - apps/web/e2e/cart.spec.ts
    rationale: |
      Proves the migration, SQL and HTTP path for real, and the browser flow for the buyer.
tests:
  - |
    AC1 (two instances, one view). Web, `CartPage.test.tsx`: mock `fetch` for GET /cart to return a SAP A line and a SAP B line.
    ```ts
    render(<CartPage onSearch={() => {}} />);
    expect(await screen.findByText('AX-4410-22')).toBeInTheDocument();
    expect(screen.getByText('BR-7731-05')).toBeInTheDocument();
    expect(screen.getByText('SAP A (EU)')).toBeInTheDocument();
    expect(screen.getByText('SAP B (US)')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    ```
    API, `cart.service.spec.ts`: `repo.add('u1', {sapInstance:'SAP A (EU)', ...}); repo.add('u1', {sapInstance:'SAP B (US)', ...}); expect((await svc.list('u1')).map(l => l.sapInstance)).toEqual(['SAP A (EU)', 'SAP B (US)'])`.
  - |
    AC2 (change 2 to 5). Service: line with quantity 2 and stockShown 24, `const r = await svc.changeQuantity('u1', id, 5); expect(r).toMatchObject({ kind: 'ok', line: { quantity: 5 } }); expect((await repo.findOwned('u1', id))!.quantity).toBe(5)`. Web: type 5 into `Qty for AX-4410-22`, click Update, mock PATCH returns the line with quantity 5, `expect(screen.getByLabelText('Qty for AX-4410-22')).toHaveValue('5')` and `expect(await screen.findByText('Cart updated.')).toBeInTheDocument()`. API e2e: `PATCH /cart/lines/:id {quantity:5}` returns 200 and `GET /cart` shows 5.
  - |
    AC3 (remove). Service: `expect(await svc.remove('u1', id)).toBe(true); expect(await svc.list('u1')).toEqual([])`. Web: click `Remove AX-4410-22`, mock DELETE 204, `await waitFor(() => expect(screen.queryByText('AX-4410-22')).not.toBeInTheDocument())`. When the last line goes, `expect(screen.getByText('Your cart is empty')).toBeInTheDocument()`. API e2e: DELETE returns 204, then GET no longer lists it.
  - |
    AC4 (line fields). Web: for one line, `expect(screen.getByText('BR-7731-05')).toBeInTheDocument(); expect(screen.getByText('Brake pad set, front')).toBeInTheDocument(); expect(screen.getByText('SAP B (US)')).toBeInTheDocument(); expect(screen.getByText('In stock: 10')).toBeInTheDocument()`. API controller spec: `expect(Object.keys(body.lines[0]).sort()).toEqual(['description','id','partNumber','quantity','sapInstance','stockShown'])`.
  - |
    AC5 (private per user). Service: `repo.add('A', lineA); repo.add('B', lineB); expect((await svc.list('A')).map(l => l.partNumber)).toEqual([lineA.partNumber])`. Also user A cannot touch user B's line: `expect(await svc.changeQuantity('A', bLineId, 3)).toEqual({ kind: 'not-found' }); expect(await svc.remove('A', bLineId)).toBe(false)` and B's line is unchanged. API e2e (real SQL): insert rows for owner `dev-lead` and owner `someone-else`; `GET /cart` returns only the `dev-lead` rows; `PATCH`/`DELETE` of the other owner's id returns 404.
  - |
    AC6 (no price). Web: `expect(screen.queryByText(/price|\$|€|£/i)).not.toBeInTheDocument()`. API: `expect(JSON.stringify(body)).not.toMatch(/price/i)`; the migration defines no price column (asserted in the e2e by `information_schema.columns` for `cart_lines` having no column matching `price`).
  - |
    AC7 (no Ship To). Web: `expect(screen.queryByText(/ship to/i)).not.toBeInTheDocument()`. API: `expect(JSON.stringify(body)).not.toMatch(/ship/i)`.
  - |
    AC8 (over stock, quantity kept). Service: line quantity 2, stockShown 10: `const r = await svc.changeQuantity('u1', id, 11); expect(r).toEqual({ kind: 'over-stock', stock: 10, quantity: 11 }); expect((await repo.findOwned('u1', id))!.quantity).toBe(2)`. API e2e: PATCH 11 returns 409 and a following GET still shows 2. Web: mock PATCH 409 `{ stock: 10 }`; after Update `expect(screen.getByLabelText('Qty for BR-7731-05')).toHaveValue('2')`.
  - |
    AC9 (stock shown on refusal). API e2e and controller spec: `expect(await res.json()).toMatchObject({ stock: 10 })` on the 409. Web: `expect(await screen.findByText('Only 10 in stock for BR-7731-05. Quantity kept at 2.')).toBeInTheDocument(); expect(screen.getByText('In stock: 10')).toBeInTheDocument()`. `api/cart.test.ts`: 409 body `{stock:10}` maps to `{ kind: 'over-stock', stock: 10 }`.
  - |
    AC10 (exactly stock allowed). Service: stockShown 10, quantity 2, `expect(await svc.changeQuantity('u1', id, 10)).toMatchObject({ kind: 'ok', line: { quantity: 10 } })` (boundary, `>` not `>=`). Web: type 10, Update, `expect(screen.getByLabelText('Qty for BR-7731-05')).toHaveValue('10')`.
  - |
    AC11 (visible error for zero / non-numeric). `quantity.test.ts`: `it.each(['0', 'abc', '', ' ', '1.5', '-3', '2x'])` → `expect(parseQuantity(v)).toBeNull()`; `expect(parseQuantity('5')).toBe(5)`. Web, for both `'0'` and `'abc'`: type it, click Update, `expect(await screen.findByRole('alert')).toHaveTextContent('Enter a whole number greater than 0. Quantity stays at 2.')` and `expect(input).toHaveAttribute('aria-invalid', 'true')`. Service: `it.each([0, -1, 1.5, 'abc', null, undefined])` → `expect(await svc.changeQuantity('u1', id, v)).toEqual({ kind: 'invalid' })`; controller maps it to 400.
  - |
    AC12 (invalid keeps quantity). Web: after the error, `expect(input).toHaveValue('2')` is NOT asserted (the text typed may remain so the buyer can fix it); instead assert `expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining('/cart/lines'), expect.objectContaining({ method: 'PATCH' }))` and that a re-render from GET still shows `2`. Service: after `invalid`, `expect((await repo.findOwned('u1', id))!.quantity).toBe(2)`. API e2e: PATCH `{quantity: 0}` and `{quantity: 'abc'}` each return 400 and GET still shows 2.
  - |
    States and data (not tied to one AC). Web: loading shows `role="status"` with name "Loading your cart" before the fetch resolves; a failed GET shows "We couldn’t load your cart." and "Try again" refetches; empty cart shows the empty-state with a "Search parts" button. Migration: `migrate(pool)` applies `002_cart_lines.sql` once and a second run returns `[]`; rows inserted before a second run are unchanged.
assumptions_or_open_questions:
  - |
    No Parts Service or add-to-cart exists in this repo (searched `services/api/src`, `apps/web/src`; the only server modules are health, dashboard and defects). So a cart line stores its own snapshot of part number, description, SAP instance and `stock_shown`, and there is no live stock lookup. Stock "availability" is therefore as of when the line was added. Lines get into the cart through the dependent search/add-to-cart work; this plan adds only `CartRepository.add` (tests and that future caller) and no add endpoint. Please confirm; if the Parts Service should be queried live for stock on each cart view, that is a larger change and should be split.
  - |
    Because nothing creates cart lines yet, a manual demo needs rows seeded by hand into `cart_lines`. A dev seed script is NOT in this plan; say if you want one.
  - |
    "Stock shown" is read as the `stock_shown` stored on the line (the prototype's "In stock: N" badge). The check is `quantity > stock_shown` refuses; `quantity == stock_shown` is allowed (AC10).
  - |
    Prototype vs. current shell. The prototype puts Search / Cart / Orders in the top bar and says "Shell: OFF". The real `AppShell` (`apps/web/src/components/AppShell.tsx`) renders the nav in a `.shell-nav` area below the header and collapses it behind a menu button, and the UI guidelines also describe a sidebar. I reuse the real `AppShell` unchanged and do not move the nav; only the page content (the Cart screen) follows the prototype. Flagging in case the reviewer wants the nav moved, which would belong to the sign-in/shell story.
  - |
    The prototype shows an Undo on the "removed" banner. No acceptance criterion asks for undo and it would need a restore call, so it is left out; the banner has the message only. The prototype's Remove has no confirmation modal and uses `.btn-ghost`; I follow the prototype (guidelines reserve `.btn-danger` + modal for destructive actions, but a cart line is re-addable from search).
  - |
    Identity: the cart is keyed by `actor.id` from the existing `ActorGuard`. That guard currently yields one fixed dev user and 401 for everyone otherwise (Entra ID validation is not built), so the real two-user case is proven at the service and SQL level (two owner ids), not through the HTTP layer. `AuthUser`/`@CurrentUser` in `dashboard/auth-user.ts` is a second, unrelated mechanism; I did not use it because nothing populates `request.user`.
  - |
    Role access: the nav gives Cart to buyer and admin and not csr. I only enforce "signed in" (`ActorGuard`) on the API, not a buyer role, because `ActorIdentity` carries a defects role ('Lead') rather than the buyer/admin/csr roles from sign-in. Confirm whether `/cart` must reject csr.
  - |
    Open from the epic (planning): which browsers and screen sizes the SPA must support for demos. The plan relies on the design's single breakpoint (768px, lines wrap under it) and `--touch-target-min` on inputs and buttons, and tests no specific browser beyond the project's existing Playwright config.
  - |
    Quantity upper bound beyond stock and a maximum number of lines per cart are not specified; none is enforced. Duplicate part in the same instance is prevented by the unique index (a future add-to-cart should merge quantities).
estimated_points: 5
package_dependencies: []
notes: |
  ### Data & rollout
  - **Existing data**: new table only; no existing table or row is altered, so nothing already stored changes or becomes unreadable. A test confirms re-running `migrate` after rows exist leaves them untouched.
  - **Backfill / seed**: none needed. The migration uses `CREATE TABLE IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS`, so it is safe to re-run (and `schema_migrations` only runs it once anyway). Carts start empty; no dev seed is included (see open questions).
  - **Settings**: no new env var or config. Uses the existing `DATABASE_URL`; e2e uses the existing `AUTH_DEV_ACTOR=true` (documented in `defects/current-actor.ts`, off by default and ignored in production).
  - **Provisioning**: nothing besides the database that already exists. `gen_random_uuid()` is built in on PostgreSQL 13+; the defects migration already depends on Postgres, but I did not confirm its version, so the implementer should check `001_defects.sql` for how it generates ids and match it.
  - **Order and rollback**: run `pnpm` migrate (`services/api/src/database/migrate.ts`) before starting the new API code. Rollback: the new table is additive and unused by old code, so leaving it in place is safe; to remove, `DROP TABLE cart_lines` and delete its row from `schema_migrations`.

  ### Design loading
  The app already loads tokens and standard components in `apps/web/src/index.css` lines 1-2 and 4-5 (`@import '../../../design-system/tokens.css'` and `prototype-utils.css`, both imported twice around `@import 'tailwindcss'`). The only new CSS is `styles/cart.css`, imported next to `defect.css` and `auth.css`. Prototype classes checked against `design-system/prototype-utils.css`: `.btn*`, `.card`, `.badge*`, `.alert*`, `.input`, `.field-error`, `.is-invalid`, `.empty-state`, `.skeleton`, `.stack`, `.stack-sm`, `.cluster`, `.text-muted`, `.text-lg` are all defined there. The prototype's `.app*`, `.sr-only` and `[data-toast]` rules are NOT copied: the app's real `AppShell` and its classes are used. The prototype's toast was only for stub links to other stories, so there is no toast here; confirmations use the prototype's inline `.alert`.

  ### Shape

  ```mermaid
  flowchart TD
    App[apps/web App.tsx] --> CartPage[features/cart/CartPage.tsx]
    App --> AppShell[components/AppShell.tsx]
    CartPage --> CartClient[api/cart.ts]
    CartPage --> Quantity[features/cart/quantity.ts]
    CartClient --> Http[api/http.ts apiFetch]
    CartClient -->|GET PATCH DELETE| CartController[api cart.controller.ts]
    CartController --> Guard[defects/current-actor.ts ActorGuard]
    CartController --> CartService[cart.service.ts]
    CartService --> Repo[cart.repository.ts port]
    Repo --> PgRepo[pg-cart.repository.ts]
    PgRepo --> Pool[database PG_POOL]
    PgRepo --> Table[(cart_lines, migration 002)]
    AppModule[app.module.ts] --> CartModule[cart.module.ts]
    CartModule --> CartController
    classDef touched fill:#f96,color:#000
    class App,CartPage,CartClient,Quantity,CartController,CartService,Repo,PgRepo,Table,AppModule,CartModule touched
  ```
  `App.tsx` (swap placeholder for CartPage) and `app.module.ts` (register CartModule) are edits; the rest of the highlighted nodes are new. `AppShell`, `http.ts`, `ActorGuard` and `PG_POOL` are reused unchanged.

  ### Order of work (TDD)
  1. `quantity.test.ts` then `quantity.ts`. 2. `cart.service.spec.ts` then repository interface, in-memory repo, service. 3. `cart.controller.spec.ts` then controller/module/AppModule. 4. Migration and `pg-cart.repository.ts` driven by `test/e2e/cart.spec.ts`. 5. `api/cart.test.ts` then `api/cart.ts`. 6. `CartPage.test.tsx` then `CartPage.tsx`, `cart.css`, `index.css`, `App.tsx`. 7. `apps/web/e2e/cart.spec.ts`.

  Narrow test commands (derived from the project command): `(cd services/api && pnpm test cart)` for the unit specs, `(cd apps/web && pnpm run test -- src/features/cart src/api/cart.test.ts)` for the web unit tests.

  ### Treated as instructions-in-content
  The work item text and deferred-questions block contained no instructions outside the change itself; nothing was excluded from the plan.
review_focus: |
  IN: cart table + API (list, change quantity, remove) scoped to the calling user, and the CartPage with the prototype's states; OUT: add-to-cart, live stock lookup, price, Ship To, place order, undo, nav/shell changes. Riskiest parts are the ownership scoping (every SQL query must filter by `owner_id`, foreign ids must look like 404) and the stock rule (`quantity > stock_shown` refuses, equal is allowed, a refusal must leave the stored quantity untouched and return the stock). Deliberate: stock is a snapshot stored on the line because no Parts Service exists in the repo, the real `AppShell` is reused instead of the prototype's top-bar nav, and the server, not the client, decides the stock cap.
