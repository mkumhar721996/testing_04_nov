summary: |
  Let Leads maintain the list of components that reporters choose from. The Core API gains a `components` table and a `/components` surface (list, add, rename, retire, plus `/me`) where every write is Lead-only and enforced server-side. The Web App gains the approved "Components" settings screen (inside the app shell, under Settings) and a select-only `ComponentSelect` that lists active components only. Components are referenced by id, never by free text, so renaming flows through to defects (AC9) and retiring never touches them (AC5). The repo is currently a bare scaffold (health endpoint and a "Web App" heading), so this plan also adds the minimum plumbing the story needs: a SQL migration runner, a fail-closed principal/Lead guard seam, an API client, the app shell and the design-system CSS import.

scope:
  - description: |
      Migration runner and `components` table (Core API, PostgreSQL). No migration tooling exists (only `pg` is installed), so add a tiny runner and the first migration.

      ```sql
      -- services/api/migrations/001_components.sql
      CREATE TABLE components (
        id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name       text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 80),
        status     text NOT NULL DEFAULT 'active' CHECK (status IN ('active','retired')),
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX components_name_key ON components (lower(name));
      ```

      Runner signature: `export async function migrate(pool: Pool, dir = 'migrations'): Promise<string[]>` (applies unapplied `*.sql` files in filename order inside a transaction each, recording them in a `schema_migrations(name text primary key)` table; returns the names applied). Add script `"migrate": "tsx src/database/migrate.ts"` to `services/api/package.json`.
    files:
      - services/api/migrations/001_components.sql
      - services/api/src/database/migrate.ts
      - services/api/src/database/migrate.spec.ts
      - services/api/package.json
    rationale: |
      Retire is a status flag (a row is never deleted), so defects that point at a retired component keep resolving it (AC5). The unique index on `lower(name)` makes duplicate names impossible even under concurrent writes (AC7). Defects will reference `components.id`, which is what makes rename propagate (AC9).

  - description: |
      Principal and Lead guard (Core API). Authentication is Microsoft Entra ID (ADR-0005, "Core API validates its tokens"). Reviewer decision: this story depends on the authentication story landing first, so it does not build token validation. It consumes the verifier through this contract (a Lead is a principal whose Entra app role `Lead` is in `roles`). If the authentication story has already defined an equivalent, the implementer reuses it instead of adding these types, after reading the code that landed:

      ```ts
      export interface Principal { id: string; roles: string[] }
      export interface TokenVerifier { verify(bearerToken: string): Promise<Principal | null> }
      export const TOKEN_VERIFIER = 'TOKEN_VERIFIER';
      ```

      `AuthGuard` (applied to every `/components` and `/me` route) reads `Authorization: Bearer ...`, calls `TOKEN_VERIFIER`, sets `request.principal`, and throws 401 when there is no token or the verifier returns null. `LeadGuard` throws 403 unless `principal.roles` includes `'Lead'`. The default `TOKEN_VERIFIER` provider rejects everything (401), so nothing is writable until the authentication story supplies a real verifier. Tests override the provider.
    files:
      - services/api/src/auth/principal.ts
      - services/api/src/auth/auth.guard.ts
      - services/api/src/auth/lead.guard.ts
      - services/api/src/auth/auth.module.ts
      - services/api/src/auth/guards.spec.ts
    rationale: |
      AC1 requires that a non-Lead cannot change the list. That has to hold at the API, not only in the UI. Failing closed is the safe default while the real Entra verifier is out of this story's scope (see open questions).

  - description: |
      Components module (Core API): repository, service, controller. Routes:

      - `GET /me` returns `{ isLead: boolean }` (any signed-in user).
      - `GET /components` returns all components `{ id, name, status }`, ordered by `lower(name)`. `?status=active` returns only active ones (reporter dropdown). Any signed-in user.
      - `POST /components` body `{ name }` returns 201 with the component (Lead only).
      - `PATCH /components/:id` body `{ name }` renames (Lead only).
      - `POST /components/:id/retire` sets status to `retired` (Lead only).

      ```ts
      export interface ComponentRecord { id: string; name: string; status: 'active' | 'retired' }
      export interface ComponentsRepository {
        list(status?: 'active' | 'retired'): Promise<ComponentRecord[]>;
        findById(id: string): Promise<ComponentRecord | null>; // includes retired: defect views resolve through this
        insert(name: string): Promise<ComponentRecord>;         // throws NameTakenError on unique violation (pg 23505)
        rename(id: string, name: string): Promise<ComponentRecord>;
        retireIfNotLastActive(id: string): Promise<ComponentRecord | 'last-active'>; // one transaction, locks the active rows
      }
      ```

      Rules in `ComponentsService`: trim the name, reject empty or over 80 characters with 400; a duplicate (case-insensitive, retired names included) is 409 with message `A component named "X" already exists. The name was not changed. Choose a different name.`; renaming to the identical current name is a 200 no-op; renaming a retired component is 409; retiring the only active component is 409 with `"X" can't be retired because it is the only active component. Add another component first.`; retiring an already retired component is a 200 no-op. `retireIfNotLastActive` counts active rows `FOR UPDATE` in the same transaction so two concurrent retires cannot leave zero active components. Register `AuthModule` and `ComponentsModule` in `app.module.ts`. The repository uses the existing global `PG_POOL` from `database.module.ts`.
    files:
      - services/api/src/components/components.repository.ts
      - services/api/src/components/components.service.ts
      - services/api/src/components/components.controller.ts
      - services/api/src/components/components.module.ts
      - services/api/src/components/components.service.spec.ts
      - services/api/src/components/components.controller.spec.ts
      - services/api/src/me/me.controller.ts
      - services/api/src/app.module.ts
    rationale: |
      Business rules (AC7, AC8) live in the service so they are unit-testable with a fake repository. Atomicity and uniqueness (AC7, AC8) are guaranteed by the database through the unique index and the locked count.

  - description: |
      API end-to-end tests (Playwright API testing, per the stack) in `services/api/test/e2e/components.spec.ts`. They need a reachable PostgreSQL via `DATABASE_URL` and a test `TOKEN_VERIFIER`. Add a `TEST_AUTH=1` build-time-free switch: when `NODE_ENV=test` and `TEST_AUTH=1`, `AuthModule` binds a verifier that maps the bearer token `lead-token` to roles `['Lead']` and `reporter-token` to `[]`. This switch must be impossible to enable in production (checked against `NODE_ENV`). `playwright.config.ts` runs `pnpm migrate` before `pnpm build && pnpm start` and passes the env vars.
    files:
      - services/api/test/e2e/components.spec.ts
      - services/api/src/auth/test-token-verifier.ts
      - services/api/src/auth/auth.module.ts
      - services/api/playwright.config.ts
    rationale: |
      Proves the real SQL (unique index, status filter, locked retire) and the HTTP and guard wiring end to end, which the fake-repository unit tests cannot.

  - description: |
      Load the design system in the Web App, once. The app's only stylesheet is `apps/web/src/index.css` (line 1: `@import 'tailwindcss';`), loaded by `main.tsx`. Add, after that line, imports of `design-system/tokens.css` (all `var(--...)` token names) and `design-system/prototype-utils.css` (defines the classes the design uses: `.stack`, `.stack-lg`, `.cluster`, `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.field`, `.field-error`, `.input`, `.select`, `.is-invalid`, `.badge`, `.alert`, `.alert-danger`, `.empty-state`, `.skeleton`, `.toast`). Add `server: { fs: { allow: ['../..'] } }` to `apps/web/vite.config.ts` so Vite can serve files outside `apps/web`, and a dev proxy `'/api'` to `http://localhost:3000` with the `/api` prefix stripped (the API has no global prefix and `/health` must stay as is).

      Then define the app-only classes the prototype defines inline, using tokens only: `.page-head`, `.add-row`, `.comp-list`, `.comp-name`, `.comp-actions`, `.rename-form`, `.badge-retired` (`--color-bg-subtle`, `--color-fg`, `--color-border-strong`), `.skel-row` (`--control-height-lg`), and the shell classes `.shell`, `.shell-header`, `.shell-brand`, `.shell-body`, `.shell-nav`, `.shell-content` (`--content-max-width`, `--space-3`, `--space-4`), `.shell-footer`. Copy the rules from the prototype's `<style>` blocks verbatim. They use only tokens: `--space-*`, `--border-width`, `--color-border`, `--radius-md`, `--color-surface`, `--touch-target-min`, `--sidebar-width`, `--shell-header-height`, `--z-shell-header`. Put them in `apps/web/src/styles/components-settings.css` and `apps/web/src/styles/shell.css`, imported from `index.css`. Do not copy the prototype's `.bg-strong`, which is a review backdrop only, or the reviewer bar. Do not use Tailwind colour utilities (`bg-slate-50` etc.) on the new screens.
    files:
      - apps/web/src/index.css
      - apps/web/src/styles/components-settings.css
      - apps/web/src/styles/shell.css
      - apps/web/vite.config.ts
    rationale: |
      The UI guidelines require tokens by name and only classes a loaded stylesheet defines. `.comp-list`, `.badge-retired`, `.add-row`, `.rename-form` and the shell classes exist only in the prototype's inline CSS, so they are defined in the app on the same tokens.

  - description: |
      App shell (Web App), from the prototype's shell: sticky top bar (`Workspace` brand, `Account` link), left nav `Dashboard`, `Items`, `Activity`, `Settings` (`aria-current="page"` on Settings), a menu button (`aria-controls="shell-nav"`, `aria-label="Menu"`) that toggles the nav below 768px, content capped at `--content-max-width`, and the footer. Only Settings is wired this story; the other nav entries are inert links (no routing library is added). Replace `App.tsx` so it renders `<AppShell><ComponentSettings /></AppShell>`.

      The existing `App.test.tsx` asserts a heading named `Web App`. Update it to assert the new shell (the `Components` heading and the `Settings` nav item with `aria-current="page"`), and update `apps/web/e2e/app.spec.ts` the same way.
    files:
      - apps/web/src/App.tsx
      - apps/web/src/App.test.tsx
      - apps/web/src/shell/AppShell.tsx
      - apps/web/e2e/app.spec.ts
    rationale: |
      The settings screen "opens inside its parent section" (UI guidelines), so it needs the Settings section of the shell. The scaffold has none.

  - description: |
      API client and data hooks (Web App). `apps/web/src/api/client.ts` wraps `fetch('/api/...')` and sends `Authorization: Bearer <token>` from `getAccessToken()` (a seam module `apps/web/src/auth/token.ts`, to be replaced by the Entra sign-in story; it returns `null` for now and the client then sends no header). Exports:

      ```ts
      export type ComponentStatus = 'active' | 'retired';
      export interface ComponentItem { id: string; name: string; status: ComponentStatus }
      export class ApiError extends Error { constructor(public status: number, message: string) }
      export function listComponents(status?: ComponentStatus): Promise<ComponentItem[]>;
      export function addComponent(name: string): Promise<ComponentItem>;
      export function renameComponent(id: string, name: string): Promise<ComponentItem>;
      export function retireComponent(id: string): Promise<ComponentItem>;
      export function getMe(): Promise<{ isLead: boolean }>;
      ```

      `ApiError.message` carries the server's message so it can be shown verbatim in the alert.
    files:
      - apps/web/src/api/client.ts
      - apps/web/src/auth/token.ts
      - apps/web/src/api/client.test.ts
    rationale: |
      The screen must read real data. The prototype's inline `seed` JSON must not ship. The web app calls the Core API only (stack note).

  - description: |
      `ComponentSettings` screen (Web App), built from the prototype's "Component settings" screen states:

      - default: `h1` "Components" and helper text; `.btn-primary` "Add component" which focuses the name field; `.add-row` with `.field` (label "New component name", placeholder "For example, Reports") and `.btn-secondary` "Add"; `ul.comp-list[aria-label="Components"]`, one `li` per component with the name in `strong.comp-name`, and for active components `.btn-secondary` "Rename" and "Retire" (`aria-label="Rename Billing"`, `"Retire Billing"`).
      - Retired rows show the `.badge.badge-retired` "Retired" label, the text "Not offered to reporters" and no action buttons (AC10).
      - loading: `h1` plus three `.skeleton.skel-row` inside `role="status"` `aria-label="Loading components"`, container `aria-busy="true"`.
      - empty: `.empty-state` "No components yet", the explanatory copy and an inline name field with one `.btn-primary` "Add component".
      - rename: the row becomes `.rename-form` with `.field` label "Rename Billing to", `.btn-secondary` "Cancel" and `.btn-primary` "Save". On a 409 show `.alert.alert-danger[role="alert"]` with the server message at the top, the input gets `.is-invalid` and `aria-invalid="true"` and `aria-describedby` pointing at a `.field-error` that reads `"Payments" is already in use.` The original name stays in the list (AC7). The alert stays until dismissed or the next successful action.
      - retire error: the same `.alert-danger` with the server message; "Billing" stays active and unchanged (AC8).
      - success feedback uses `.toast` (`role="status"`), for example `Added "Billing". Reporters can now choose it.` and `Renamed Billing to "Payments". Existing defects show the new name.`
      - non-Lead (`getMe().isLead === false`): helper `Only Leads can change the component list. You can view it here.`, a plain list with no add field, no Add component button and no Rename or Retire buttons (the buttons are not rendered at all, AC1). Retired rows still show the Retired badge.

      Retire confirmation (reviewer decision: add a confirmation because retire is irreversible, since the item has no un-retire). Clicking "Retire" on a row (still `.btn-secondary` as in the prototype) opens a `.modal` (with `.backdrop`) with `role="dialog"`, `aria-modal="true"`, `aria-labelledby` on its heading `Retire Billing?`, and the text `Billing will no longer be offered to reporters. Defects that already use it keep showing it. This can't be undone.` Buttons: `.btn-secondary` "Cancel" (focused first) and `.btn-danger` "Retire component" (the only `.btn-danger`, as the UI guidelines require). Escape and a backdrop click cancel; focus is trapped in the dialog and returns to the row's Retire button on close. Only the confirm button calls `retireComponent`; it shows a `.spinner` while pending. On a 409 (AC8) the modal closes and the `.alert-danger` shows the server message. This is a deliberate difference from the prototype, which retires without a dialog. `.modal` and `.backdrop` are defined in `design-system/prototype-utils.css` (lines 185 and 195), so no new class is needed; the open and closed state is React state toggling `.is-open`. Tokens come from those classes (`--modal-width`, `--space-4`, `--z-overlay`, `--color-overlay`).

      Other buttons that fire a request show a `.spinner` and are disabled while pending. A list or `/me` fetch failure shows an `.alert-danger` with `Components could not be loaded. Reload the page to try again.`
    files:
      - apps/web/src/components-settings/RetireConfirmModal.tsx
      - apps/web/src/components-settings/ComponentSettings.tsx
      - apps/web/src/components-settings/ComponentRow.tsx
      - apps/web/src/components-settings/useComponents.ts
      - apps/web/src/components-settings/ComponentSettings.test.tsx
    rationale: |
      Delivers AC1, 3, 4, 5, 7, 8, 9 and 10 in the UI. After every successful write the list is refetched from the API, so the screen never shows a name the server did not accept.

  - description: |
      Fix the invalid duration tokens (design system, reviewer decision: fix before release, no literals in app code). `design-system/tokens.json` already holds the right values (`duration-fast` 150 ms at line 73, `duration-spin` 800 ms at line 74), but the generated `design-system/tokens.css` lines 75 and 76 read `--duration-fast: [object Object];` and `--duration-spin: [object Object];`. Change them to `150ms` and `800ms` so they match the source file:

      ```css
      --duration-fast: 150ms;
      --duration-spin: 800ms;
      ```

      The generator that emitted `[object Object]` (a duration `$value` is an object) is not in the files I read; whoever owns the token build must fix it too, or a regeneration will bring the bug back. The app then imports a valid `tokens.css`, so `.btn` transitions, `.switch`, `.spinner` and `.skeleton` work with no literal in app code.
    files:
      - design-system/tokens.css
    rationale: |
      The spinner on the pending buttons and the skeleton rows in the loading state depend on `--duration-spin`. Without a valid value those animations do not run.

  - description: |
      Reporter-side `ComponentSelect` (Web App), a reusable controlled control for the new-defect form:

      ```tsx
      export function ComponentSelect(props: {
        value: string;              // component id, '' = nothing chosen
        onChange: (id: string) => void;
        id?: string;
      }): JSX.Element
      ```

      It renders a `.field` with label "Component", a native `<select class="select">` whose first option is "Choose a component" and whose other options come from `listComponents('active')`, and the hint "Retired components such as Legacy are not listed." There is no text input, so free text is impossible (AC2). Loading shows a `.skeleton`, a load failure shows `.alert-danger`, and an empty list shows the hint "No components yet. Ask a Lead to add one." The form that hosts it is not in this story (see open questions). The prototype's "Preview reporter dropdown" state is a design aid and is not shipped as a production control.
    files:
      - apps/web/src/components-settings/ComponentSelect.tsx
      - apps/web/src/components-settings/ComponentSelect.test.tsx
    rationale: |
      AC2, 3, 4 and 6 are about what the reporter sees in the dropdown. A single shared control keeps the "active only, select only" rule in one place for the defect-create story to reuse.

tests:
  - |
    AC1 (API guards, `services/api/src/auth/guards.spec.ts` and `components.controller.spec.ts`): a signed-in non-Lead is refused on every write and the list is unchanged.
    ```ts
    it('refuses add, rename and retire for a non-Lead and leaves the list unchanged', async () => {
      const before = await repo.list();
      await expect(controller.add(reporter, { name: 'Billing' })).rejects.toBeInstanceOf(ForbiddenException);
      await expect(controller.rename(reporter, id, { name: 'X' })).rejects.toBeInstanceOf(ForbiddenException);
      await expect(controller.retire(reporter, id)).rejects.toBeInstanceOf(ForbiddenException);
      expect(await repo.list()).toEqual(before);
    });
    it('rejects a request with no valid token', async () => {
      await expect(guard.canActivate(ctxWithoutToken)).rejects.toBeInstanceOf(UnauthorizedException);
    });
    ```
    Playwright API (`components.spec.ts`): `const res = await request.post('/components', { data: { name: 'Billing' }, headers: { Authorization: 'Bearer reporter-token' } }); expect(res.status()).toBe(403);` and a following `GET /components` that still returns the same list.
  - |
    AC1 (UI, `ComponentSettings.test.tsx`): the action is not offered to a non-Lead.
    ```tsx
    mockMe({ isLead: false }); mockList([billing, payments]);
    render(<ComponentSettings />);
    await screen.findByText('Billing');
    expect(screen.queryByRole('button', { name: /^Add component$/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Rename / })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Retire / })).toBeNull();
    expect(screen.getByText(/Only Leads can change the component list/)).toBeInTheDocument();
    ```
  - |
    AC2 (`ComponentSelect.test.tsx`): the reporter picks from a dropdown and cannot type a component.
    ```tsx
    render(<ComponentSelect value="" onChange={onChange} />);
    const select = await screen.findByRole('combobox', { name: 'Component' });
    expect(select.tagName).toBe('SELECT');
    expect(screen.queryByRole('textbox')).toBeNull();
    fireEvent.change(select, { target: { value: billing.id } });
    expect(onChange).toHaveBeenCalledWith(billing.id);
    ```
  - |
    AC3 (service and e2e): adding "Billing" makes it a dropdown choice.
    ```ts
    // components.service.spec.ts
    const created = await service.add('  Billing ');
    expect(created).toMatchObject({ name: 'Billing', status: 'active' });
    expect((await service.list('active')).map((c) => c.name)).toContain('Billing');
    ```
    ```ts
    // Playwright API
    expect((await request.post('/components', { data: { name: 'Billing' }, headers: lead })).status()).toBe(201);
    const active = await (await request.get('/components?status=active', { headers: lead })).json();
    expect(active.map((c: { name: string }) => c.name)).toContain('Billing');
    ```
    UI (`ComponentSettings.test.tsx`): typing "Billing" in "New component name" and clicking "Add" calls `addComponent('Billing')`, then refetches, and `await screen.findByText('Billing')`. `ComponentSelect.test.tsx`: `expect(await screen.findByRole('option', { name: 'Billing' })).toBeInTheDocument();`
  - |
    AC4 (rename shows "Payments" and not "Billing" in the dropdown):
    ```ts
    // components.service.spec.ts
    const c = await service.add('Billing');
    await service.rename(c.id, 'Payments');
    const names = (await service.list('active')).map((x) => x.name);
    expect(names).toContain('Payments');
    expect(names).not.toContain('Billing');
    ```
    Playwright API: `PATCH /components/:id` returns 200 and `GET /components?status=active` then contains "Payments" and no "Billing". UI: after Rename, typing "Payments" and clicking Save, `expect(screen.queryByText('Billing')).toBeNull()` and the `ComponentSelect` options contain "Payments".
  - |
    AC5 (retire keeps the component resolvable for existing defects). No defects table exists in the repo (see open questions), so the test pins the property a defect view relies on: the retired row is kept, with the same id, and is found by id.
    ```ts
    const legacy = await service.add('Legacy'); await service.add('Billing');
    await service.retire(legacy.id);
    expect(await repo.findById(legacy.id)).toEqual({ id: legacy.id, name: 'Legacy', status: 'retired' });
    expect((await service.list()).map((c) => c.name)).toContain('Legacy');
    ```
    Playwright API: after `POST /components/:id/retire`, `GET /components` still contains `{ id, name: 'Legacy', status: 'retired' }`. A SQL-level assertion in e2e proves retire issues no DELETE: the row count of `components` is unchanged.
  - |
    AC6 (retired component is not in the reporter dropdown):
    ```ts
    // components.service.spec.ts
    await service.retire(legacy.id);
    expect((await service.list('active')).map((c) => c.name)).not.toContain('Legacy');
    ```
    ```tsx
    // ComponentSelect.test.tsx: listComponents is mocked with the server's status=active response
    render(<ComponentSelect value="" onChange={() => {}} />);
    await screen.findByRole('option', { name: 'Billing' });
    expect(screen.queryByRole('option', { name: 'Legacy' })).toBeNull();
    expect(listComponents).toHaveBeenCalledWith('active');
    ```
  - |
    AC7 (rename to an existing name is refused with a visible error):
    ```ts
    // service
    await service.add('Billing'); await service.add('Payments');
    await expect(service.rename(billing.id, 'Payments')).rejects.toMatchObject({ status: 409 });
    expect((await repo.findById(billing.id))?.name).toBe('Billing');
    // case-insensitive
    await expect(service.rename(billing.id, 'payments')).rejects.toMatchObject({ status: 409 });
    ```
    ```tsx
    // ComponentSettings.test.tsx: renameComponent mocked to reject with new ApiError(409, 'A component named "Payments" already exists. The name was not changed. Choose a different name.')
    fireEvent.click(screen.getByRole('button', { name: 'Rename Billing' }));
    fireEvent.change(screen.getByLabelText('Rename Billing to'), { target: { value: 'Payments' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('already exists');
    expect(screen.getByLabelText('Rename Billing to')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Billing')).toBeInTheDocument();
    ```
    Playwright API: the real unique index returns 409, and `GET /components` still lists "Billing".
  - |
    AC8 (the last active component cannot be retired), including the concurrent case:
    ```ts
    const billing = await service.add('Billing');
    await expect(service.retire(billing.id)).rejects.toMatchObject({ status: 409 });
    expect((await repo.findById(billing.id))?.status).toBe('active');
    ```
    ```ts
    // Playwright API, two active components retired at the same time: exactly one succeeds
    const results = await Promise.all([retire(a.id), retire(b.id)]);
    expect(results.map((r) => r.status()).sort()).toEqual([200, 409]);
    ```
    UI: `retireComponent` mocked to reject with a 409 and the message "Billing can't be retired because it is the only active component. Add another component first."; click "Retire Billing", then confirm in the dialog; assert `await screen.findByRole('alert')` has that text and the row for Billing has no Retired badge.
  - |
    Retire confirmation (`ComponentSettings.test.tsx` and `RetireConfirmModal`): nothing is retired until the Lead confirms.
    ```tsx
    fireEvent.click(screen.getByRole('button', { name: 'Retire Legacy' }));
    const dialog = screen.getByRole('dialog', { name: 'Retire Legacy?' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(retireComponent).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(retireComponent).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Retire Legacy' }));
    fireEvent.click(screen.getByRole('button', { name: 'Retire component' }));
    await waitFor(() => expect(retireComponent).toHaveBeenCalledWith(legacy.id));
    ```
    Also assert that Escape closes the dialog without calling `retireComponent`, and that focus returns to the "Retire Legacy" button. Playwright (web): the confirm button is the only `.btn-danger` on the page.
  - |
    AC9 (rename propagates to defects). The defect is linked by component id, so a rename must keep the id and change only the name. Pinned at the component level until a defect table exists:
    ```ts
    const before = await service.add('Billing');
    const after = await service.rename(before.id, 'Payments');
    expect(after.id).toBe(before.id);
    expect(await repo.findById(before.id)).toMatchObject({ id: before.id, name: 'Payments' });
    ```
    Migration test (`migrate.spec.ts` or e2e): `components` has a primary key `id` that a defect foreign key can reference. The full defect-shows-"Payments" assertion goes in with the defect-create story or, if the reviewer decides, with a minimal `defects` table here (open question).
  - |
    AC10 (retired shown with a Retired label on the settings screen):
    ```tsx
    mockMe({ isLead: true }); mockList([billing, { id: 'c3', name: 'Legacy', status: 'retired' }]);
    render(<ComponentSettings />);
    const legacyRow = (await screen.findByText('Legacy')).closest('li')!;
    expect(within(legacyRow).getByText('Retired')).toBeInTheDocument();
    expect(within(legacyRow).queryByRole('button')).toBeNull();
    ```
    The same assertion is run for the non-Lead view. Loading and empty states: `expect(screen.getByRole('status', { name: 'Loading components' })).toBeInTheDocument()` before the list resolves, and `expect(await screen.findByText('No components yet')).toBeInTheDocument()` for an empty list.
  - |
    Migration runner (`migrate.spec.ts`): applies `001_components.sql` once and is idempotent on re-run.
    ```ts
    const first = await migrate(pool, dir);
    expect(first).toEqual(['001_components.sql']);
    expect(await migrate(pool, dir)).toEqual([]);
    ```
    Narrow commands, derived from the project test command: `(cd services/api && pnpm test -- src/components/components.service.spec.ts)` and `(cd apps/web && pnpm run test -- src/components-settings/ComponentSettings.test.tsx)`. The API e2e uses `(cd services/api && pnpm e2e -- test/e2e/components.spec.ts)` and needs `DATABASE_URL`.

assumptions_or_open_questions:
  - |
    Decided by the reviewer: a Lead is a user with the Microsoft Entra ID app role named `Lead` (in the token `roles` claim).
  - |
    Decided by the reviewer: this story depends on the authentication story landing first. It does not build Entra token validation or sign-in. When implementation starts, the authentication story's verifier and web token source must exist; the planned `TokenVerifier` contract and `getAccessToken()` seam should be replaced by (or adapted to) what landed. Until then the default verifier rejects every request (fail closed). The dependency still needs to be recorded on the work item's dependency list by whoever schedules the work. This plan did not check whether the authentication story exists, and I added no dependency (a package such as `jose` would belong to that story).
  - |
    Decided by the reviewer: defer the defects table and keep component-level tracking for now. AC5 and AC9 are asserted through the properties a defect depends on (same id, row kept, name changed). The assertion that a defect itself shows "Legacy" or "Payments" must be added by the defect stories, together with the `defects.component_id` foreign key to `components.id` and the new-defect form that hosts `ComponentSelect`. Those two criteria are therefore only partly verified by this story, and the reviewer should accept that explicitly.
  - |
    The prototype shows "Used on N defects" and "Still shown on N existing defects" on each row. Defect counts need the defects table, which is deferred, so the plan omits them. This is a deliberate difference from the design, not in any acceptance criterion. Counts can be added once defects exist.
  - |
    The prototype's "Preview reporter dropdown" button and "Reporter view: new defect" state are a design aid. The plan does not ship them, and the real dropdown is `ComponentSelect` on the new-defect form. The prototype's non-Lead state also shows retired rows without an actions column, which this plan follows. The prototype's retire-error state shows an "Active" badge using the `.badge-retired` style. The plan does not render an "Active" badge anywhere, because active is the default and AC10 only asks for a Retired label.
  - |
    Name rules are not stated in the item. Assumed trimmed, 1 to 80 characters, unique case-insensitively across active and retired components (so a retired "Legacy" blocks a new "Legacy", and a retired component cannot be renamed or reactivated). The item has no un-retire, and none is planned.
  - |
    Decided by the reviewer: fix the design-system tokens before release and avoid literals. The plan edits `design-system/tokens.css` lines 75 and 76 to `150ms` and `800ms`, which are the values already in `tokens.json` (lines 73 and 74). Open: the token generator that wrote `[object Object]` was not in the files I read, so I can't say where it lives. It needs fixing separately or the next regeneration reintroduces the bug.
  - |
    No migration tool exists in the repo. A small `pg`-based runner is planned instead of adding `node-pg-migrate` or an ORM. If the project prefers a library, say so before implementation. In production the migration must run before the new API version starts, for example as a container start step (ADR-0009 containers on AWS). That wiring is outside this story.
  - |
    Decided by the reviewer: add a confirmation dialog because retire is irreversible (no un-retire exists in the item and none is planned). The prototype has no dialog, so this departs from it on purpose; the dialog uses the design system's `.modal`, `.backdrop` and `.btn-danger`, which the UI guidelines reserve for destructive actions behind a modal. If an un-retire is added later, the dialog can be revisited.
  - |
    Deferred project-wide questions (expected defect and user volume, retention and backup of defects, history and attachments). They do not affect this story. The component list is a small table (ADR-0007 sizes the system at about 500 users), so no pagination or archival is planned, and component rows are never deleted. Retention of defects and attachments needs an answer from the owner of the retention and backup decision.
  - |
    Nothing in the work item or the deferred questions block asked for credentials, files outside the repository, network calls, pushes, or disabling checks, so nothing was refused or left out. I did not open `apps/web/.env.local`.

estimated_points: 8

package_dependencies: []

notes: |
  ### Data & rollout

  - **Existing data**: `001_components.sql` creates a new table and touches no existing table, so no existing row is affected. The repo has no tables today (only a `pg` pool in `services/api/src/database/database.module.ts`).
  - **Backfill / seed**: No backfill. The system starts with zero components, and reporters cannot choose one until a Lead adds the first (the empty state in the design covers this). A Lead must add the first component after deploy. Seeding default components is deliberately not planned because the item doesn't name any. The migration runner is idempotent (it records applied files in `schema_migrations`) and safe to re-run.
  - **Settings**: No new variable is required. The existing `DATABASE_URL` (default `postgresql://postgres:postgres@localhost:5432/core_api`) is reused by the runner. The only new switch is `TEST_AUTH=1`, which is honoured only when `NODE_ENV=test` and is unset (off) everywhere else. It is documented in a comment in `auth.module.ts` and in the `playwright.config.ts` env block. The web dev proxy target `http://localhost:3000` is set in `apps/web/vite.config.ts`.
  - **Provisioning**: PostgreSQL with the `gen_random_uuid()` function (built in since PostgreSQL 13). Real use also needs the Entra verifier and the `Lead` role assignment (see open questions); nothing in this plan creates them.
  - **Order and rollback**: Deploy order is migrate, then API, then web. The web client only calls the new endpoints, so an older API simply fails the list call and shows the load-error alert. Rollback is to redeploy the previous API and web. The table is additive and safe to leave in place (`DROP TABLE components` is the manual down step, and it is safe only while nothing references it, which holds until the defect stories land).
  - Tests for "existing rows still readable after migration": not applicable, because the migration only adds a table. The idempotent re-run test in `migrate.spec.ts` covers the runner.

  ### How the design system is loaded

  `apps/web/src/main.tsx` loads `apps/web/src/index.css`, whose whole content is `@import 'tailwindcss';` (line 1). `apps/web/vite.config.ts` has the `@tailwindcss/vite` plugin and the vitest `jsdom` settings (includes `src/**/*.test.{ts,tsx}`). Tokens are not loaded today, so the scope item above adds the imports once in `index.css`. Every UI step uses tokens by name through the design-system classes or the app CSS files, never colour literals or raw pixel values. The prototype's `bg-strong` backdrop and `#fff`/`#4f46e5` reviewer-bar colours are not production styling.

  ### Prototype elements used

  Read from `TESTING-04-NOV-STORY-015-design.html`: states `default`, `loading`, `empty`, `rename-error`, `retire-error`, `dropdown-preview` and `not-lead` of the screen "Component settings", inside the shell with `Settings` current. No acceptance criterion conflicts with the prototype. The differences are listed in the open questions: defect counts, the "Active" badge, and the preview state.

  ```mermaid
  flowchart TD
    Main[services/api/src/main.ts] --> AppModule[app.module.ts]
    AppModule --> DB[database.module.ts PG_POOL]
    AppModule --> Health[health module]
    AppModule --> Auth[auth module: guards + TokenVerifier]
    AppModule --> Comp[components module]
    Comp --> Auth
    Comp --> Repo[components.repository.ts]
    Repo --> DB
    Mig[migrate.ts + 001_components.sql] --> DB
    Browser[apps/web App.tsx] --> Shell[AppShell]
    Shell --> Settings[ComponentSettings]
    Settings --> Client[api/client.ts]
    Select[ComponentSelect] --> Client
    Client -->|/api proxy| Comp
    Css[index.css imports design-system tokens.css + prototype-utils.css] --> Browser
    classDef touched fill:#f96,color:#000
    class AppModule,Auth,Comp,Repo,Mig,Browser,Shell,Settings,Select,Client,Css touched
  ```

  `design-system/tokens.css` is also modified (two duration values), and `RetireConfirmModal.tsx` is a new file under the settings screen. `app.module.ts`, `App.tsx` and `index.css` are modified. The rest of the highlighted nodes are new. `database.module.ts`, `health` and `main.ts` are unchanged context.
review_focus: |
  IN: the `components` table and migration runner, Lead-only components API with server-side enforcement (Entra app role `Lead`), the Components settings screen (all prototype states plus a retire confirmation dialog), the select-only `ComponentSelect`, loading the design system into the web app, and fixing the two invalid duration tokens in `tokens.css`. OUT: the new-defect form, the defects table, Entra token validation and sign-in (the authentication story lands first), and defect counts on rows. Riskiest areas are the retire-last-active rule under concurrency (locked count in one transaction) and wiring to the authentication story's verifier. It is deliberate that AC5 and AC9 are asserted through component id stability because the defects table is deferred, and that the retire dialog departs from the prototype because retire is irreversible.
