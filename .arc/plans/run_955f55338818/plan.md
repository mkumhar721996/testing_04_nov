summary: |
  Let permitted users move a defect through New → Triaged → In progress → Resolved → Verified → Closed, with Reject (Triaged, final) and Reopen (Closed → Triaged). The repo is a bare scaffold (Core API has only /health and a lazy pg Pool; the web app is a placeholder heading), so this story builds the whole vertical slice: a pure transition/permission table in Core API, a `defects` and `defect_comments` schema, a `GET /defects/:id` and `POST /defects/:id/status-moves` API with optimistic-concurrency refusal, and the approved "Defect" screen in the web app (status badge, "Status moves" card, reason form for Reject/Reopen, "Comments" card, conflict banner). Reject and Reopen reasons are trimmed, required, and saved as a comment in the same transaction as the status change. Triage (New → Triaged, Triaged → In progress) and owner assignment stay in the owner story.

scope:
  - description: |
      Pure workflow rules (no I/O), the single source of truth for ACs 1, 4, 9, 11-16, 18-20.

      ```ts
      export type Status = 'New' | 'Triaged' | 'In progress' | 'Resolved' | 'Verified' | 'Closed' | 'Rejected';
      export type Role = 'Developer' | 'Tester' | 'Lead';
      export interface Actor { id: string; role: Role }
      export interface StatusMove { to: Status; label: string; requiresReason: boolean }
      export function availableMoves(defect: { status: Status; ownerId: string | null }, actor: Actor): StatusMove[];
      ```

      Transition table for this story (anything else is not offered):
      - Triaged → Rejected, label "Reject", Lead only, reason required
      - In progress → Resolved, label "Mark Resolved", owner or Lead
      - Resolved → Verified, label "Verify", role Tester only (a Lead is NOT offered it, AC20; a Developer owner is not, AC14)
      - Resolved → In progress, label "Record failed fix", Tester or Lead
      - Verified → Closed, label "Close", Lead only
      - Closed → Triaged, label "Reopen", Lead only, reason required
      - New and Rejected: no moves (New → Triaged is the owner story)
    files:
      - services/api/src/defects/workflow.ts
      - services/api/src/defects/workflow.spec.ts
    rationale: Keeping rules pure makes every offered-move AC a fast vitest unit test, and the same function drives both the offered list and the enforcement on submit, so the two cannot drift.

  - description: |
      Schema and migration. No migration tooling exists in services/api today (I looked at src/ and package.json), so add one plain SQL file and a tiny runner that applies files in `migrations/` in name order, recording them in a `schema_migrations` table, using the existing `pg` dependency (no new package). Add script `"migrate": "tsx src/database/migrate.ts"` to services/api/package.json.

      ```sql
      CREATE TABLE IF NOT EXISTS defects (
        id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        key         text NOT NULL UNIQUE,
        title       text NOT NULL,
        status      text NOT NULL DEFAULT 'New'
                    CHECK (status IN ('New','Triaged','In progress','Resolved','Verified','Closed','Rejected')),
        owner_id    text,
        row_version integer NOT NULL DEFAULT 1,
        created_at  timestamptz NOT NULL DEFAULT now(),
        updated_at  timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS defect_comments (
        id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        defect_id   uuid NOT NULL REFERENCES defects(id),
        author_id   text NOT NULL,
        author_name text NOT NULL,
        body        text NOT NULL,  -- plain text only; never interpreted as HTML
        created_at  timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS defect_comments_defect_idx ON defect_comments (defect_id, created_at);
      ```
    files:
      - services/api/migrations/001_defects.sql
      - services/api/src/database/migrate.ts
      - services/api/package.json
    rationale: The story needs somewhere to hold status and comments; the epic's create-defect and change-history stories will extend these tables, so keep the columns minimal and only what this story reads or writes.

  - description: |
      Repository + service in Core API. The repository is an interface so the service is unit-tested against an in-memory fake, with a Postgres implementation on the existing `PG_POOL` provider (use explicit `@Inject(PG_POOL)` — vitest/esbuild does not emit decorator metadata, so type-based injection would fail).

      ```ts
      export interface DefectRepository {
        findById(id: string): Promise<DefectRecord | null>;
        listComments(defectId: string): Promise<CommentRecord[]>;
        /** Atomic: updates status only if row_version still equals `expectedVersion`, bumps it, and inserts the comment (when given) in the SAME transaction. Returns false when the version had changed. */
        moveStatus(id: string, expectedVersion: number, to: Status, comment?: NewComment): Promise<boolean>;
      }
      ```
      PG implementation: `UPDATE defects SET status=$3, row_version=row_version+1, updated_at=now() WHERE id=$1 AND row_version=$2` inside BEGIN/COMMIT; rowCount 0 → ROLLBACK and return false (this is what refuses the second of two concurrent moves, ACs 23-24).

      Service `StatusMoveService.move(id, actor, { to, expectedVersion, reason? })`:
      1. load defect (404 if none);
      2. if `expectedVersion !== defect.rowVersion` → ConflictException with message "This defect was changed by someone else. Refresh to see its current status, then try again." carrying the current defect (AC23, AC24);
      3. `to` must be in `availableMoves(defect, actor)` else ForbiddenException;
      4. if the move `requiresReason`, `reason.trim()` must be non-empty else BadRequestException (ACs 2, 6, 21, 22) and nothing is written;
      5. `moveStatus(...)` with comment body `Rejected: <reason>` or `Reopened: <reason>` authored by the actor (ACs 5, 8); a false return → ConflictException with the re-read defect.
    files:
      - services/api/src/defects/defect.repository.ts
      - services/api/src/defects/pg-defect.repository.ts
      - services/api/src/defects/status-move.service.ts
      - services/api/src/defects/status-move.service.spec.ts
      - services/api/src/defects/in-memory-defect.repository.ts
    rationale: Order of checks matters — conflict first so a stale client always learns the current status, then permission, then reason, so a refused move never writes anything.

  - description: |
      HTTP surface and module wiring.

      - `GET /defects/:id` → `{ id, key, title, status, rowVersion, ownerId, ownerName, comments: [{ id, authorName, body, createdAt }], availableMoves: StatusMove[] }` (availableMoves computed for the calling actor, ACs 1, 17).
      - `POST /defects/:id/status-moves` body `{ to, expectedVersion, reason? }` → 200 with the same detail shape; 400 reason required; 403 move not permitted for this actor; 404; 409 with body `{ message, currentStatus, defect }`.

      Actor resolution (decided): a `@CurrentActor()` param decorator backed by an `ActorGuard`. When `AUTH_DEV_ACTOR=true` (default off) the guard injects a fixed test user `{ id: 'dev-lead', name: 'Dev Lead', role: 'Lead' }`, not read from any header or request input; it is ignored when `NODE_ENV === 'production'`. In every other case the actor must come from a validated Microsoft Entra ID token, and because token validation belongs to the authentication component and is not built here, the guard answers 401 until that exists. No Entra validation code is added by this story. Register `DefectsModule` in `services/api/src/app.module.ts`; add `ValidationPipe`-style manual DTO checks (no new package) for `to` being a known Status.
    files:
      - services/api/src/defects/defects.controller.ts
      - services/api/src/defects/defects.module.ts
      - services/api/src/defects/current-actor.ts
      - services/api/src/defects/current-actor.spec.ts
      - services/api/src/app.module.ts
      - services/api/test/e2e/status-moves.spec.ts
    rationale: Controller stays thin — all rules live in the workflow and service — so the e2e Playwright API test only has to prove the wiring and the real Postgres atomic update.

  - description: |
      Load the design system once in the web app. `apps/web/src/index.css` currently holds only `@import 'tailwindcss';` and `vite.config.ts` has no token mapping, so the tokens are NOT loaded today. Add, after the tailwind import:

      ```css
      @import '../../../design-system/tokens.css';
      @import '../../../design-system/prototype-utils.css';
      ```
      `prototype-utils.css` defines `.stack`, `.cluster`, `.btn*`, `.card`, `.badge*`, `.field`, `.field-hint`, `.field-error`, `.textarea`, `.is-invalid`, `.alert*`, `.avatar`, `.skeleton`, `.spinner`, `.toast`. If Vite's dev server refuses the out-of-root import, add `server: { fs: { allow: ['../..'] } }` to vite.config.ts.

      The approved prototype also uses `.page-head`, `.comment`, `.comment-reason`, `.actions` and the shell classes, which are defined only in the prototype's own inline style (not in design-system/), so define them in the app on the same tokens, copied from the prototype: `.page-head` (flex, wrap, `space-between`, gap `--space-3`), `.comment` (grid `auto 1fr`, gap `--space-2` `--space-3`), `.comment-reason` (left border `--border-width-strong` `--color-border-strong`, padding-left `--space-2`), `.actions` (flex, wrap, gap `--space-2`, `justify-content: flex-end`), and the `.shell-*` rules with the 768px breakpoint using `--shell-header-height`, `--sidebar-width`, `--content-max-width`, `--touch-target-min`.
    files:
      - apps/web/src/index.css
      - apps/web/src/styles/defect.css
      - apps/web/vite.config.ts
    rationale: Guideline 2-4 of the design-system brief — tokens load once in the entry stylesheet, and any class with no stylesheet in design-system/ is defined in the app on tokens, never as a literal.

  - description: |
      Web: API client, app shell and the Defect screen, built from the approved prototype's "Defect" screen (one screen, states per workflow stage).

      Shell (prototype `.shell`): sticky top bar with a menu button below 768px (`aria-controls="shell-nav"`), "Workspace" brand and "Account" `.btn-ghost`; left nav Dashboard, Items (`aria-current="page"`), Activity, Settings; footer. The defect opens inside Items (UI guidelines: detail screens stay in their parent section).

      `DefectPage` reads the key/id from the path `/items/:id` (no router package is installed; parse `window.location.pathname`, no new dependency) and renders:
      - `.page-head`: mono key, `<h1>` title, and a `.badge` reading `Status: <status>` always shown (AC17). Variant per prototype: Rejected `badge-danger`; In progress and Resolved `badge-warning`; Verified `badge-success`; others plain.
      - "Status moves" `.card.stack-sm` with an `<h2>`; the buttons come ONLY from `availableMoves` in the response (never computed client-side). First move is `.btn-primary` when it is the forward move ("Mark Resolved", "Verify", "Close"), otherwise `.btn-secondary` ("Reject", "Reopen", "Record failed fix"); one primary per view. With no moves: an `.alert.alert-info role="status"` ("No status move is available to you.") for a non-terminal status, plain muted text "No status move is available for a Rejected defect." for Rejected (AC4).
      - Moves with `requiresReason` open the reason panel (prototype states reject-form / reopen-form): `<h2>` "Reject defect" / "Reopen defect", hint ("Rejection is final. A reason is required and is saved as a comment." / "A reason is required and is saved as a comment. The defect moves to Triaged."), `.field` with `<label>Reason</label>`, `.textarea` rows 4, `.field-hint` example, `.actions` with `.btn-secondary` Cancel and `.btn-primary` "Reject defect" / "Reopen defect". A blank or spaces-only reason is refused client-side with `.textarea.is-invalid`, `aria-invalid`, `aria-describedby` and `.field-error role="alert"`: "Enter a reason to reject this defect. The defect stays Triaged." / "...reopen... stays Closed." (ACs 2, 6, 21, 22); the server re-checks. While submitting, the submit button is disabled with a `.spinner` and label "Rejecting…" / "Reopening…".
      - "Comments" `.card.stack-sm`: each `.comment` with `.avatar` initials, bold author, muted `.text-sm` date, text; reason comments use `.comment-reason` (AC5, AC8). Comment bodies are plain text: render as a React text child (never `dangerouslySetInnerHTML`) in a `<p>` with `white-space: pre-line` so only line breaks show; no HTML or rich formatting. Empty list: `.empty-state`-style muted line "No comments yet." without a primary button, since adding comments is another story.
      - Success: `.toast` with "Defect rejected. Reason saved as a comment." / "Defect reopened as Triaged. Reason saved as a comment." / "Status changed to <status>." for the other moves; the page re-renders from the server response.
      - Conflict (409): `.alert.alert-danger role="alert"` "Another user changed this defect. The current status is shown above; your move was refused. Refresh and try again if the move still applies." and the page is replaced by the `defect` in the 409 body, including its new `rowVersion` so a retry uses the current version (AC23, AC24). The client sends the `rowVersion` it loaded as `expectedVersion`.
      - Loading: `.skeleton` blocks in the head and cards. Load error / 404: `.alert-danger` with what happened and a "Try again" `.btn-secondary`. 403 on submit: `.alert-danger` "You can't make that move. Refresh to see the moves available to you."

      Tokens used: `--space-1..4`, `--color-fg`, `--color-fg-muted`, `--color-surface`, `--color-bg-subtle`, `--color-border`, `--color-border-strong`, `--color-primary`, `--color-on-primary`, `--color-danger(-bg)`, `--color-success(-bg)`, `--color-warning(-bg)`, `--color-info(-bg)`, `--radius-md/lg/full`, `--font-size-sm/lg/xl`, `--border-width(-strong)`, `--control-height-md`, `--touch-target-min`, `--shell-header-height`, `--sidebar-width`, `--content-max-width`. No colour or pixel literals.
    files:
      - apps/web/src/api/defects.ts
      - apps/web/src/App.tsx
      - apps/web/src/components/AppShell.tsx
      - apps/web/src/features/defect/DefectPage.tsx
      - apps/web/src/features/defect/StatusMovesCard.tsx
      - apps/web/src/features/defect/ReasonForm.tsx
      - apps/web/src/features/defect/CommentsCard.tsx
      - apps/web/src/features/defect/DefectPage.test.tsx
      - apps/web/src/features/defect/ReasonForm.test.tsx
      - apps/web/src/App.test.tsx
      - apps/web/e2e/defect-status.spec.ts
    rationale: The screen only renders what the API says is allowed, so the offered-move ACs are enforced in one place (the server) and the UI cannot offer a move the server will refuse. App.tsx currently renders a placeholder heading and its test asserts that heading, so that test is updated.

tests:
  - |
    AC1 (workflow.spec.ts): moves are exactly the defined set per status.
    ```ts
    const lead = { id: 'l1', role: 'Lead' } as const;
    expect(availableMoves({ status: 'Triaged', ownerId: null }, lead).map(m => m.to)).toEqual(['Rejected']);
    expect(availableMoves({ status: 'New', ownerId: null }, lead)).toEqual([]);
    ```
  - |
    AC2 and AC21 (status-move.service.spec.ts): empty and spaces-only rejection reason leaves Triaged and writes no comment.
    ```ts
    // every service test seeds its defect at rowVersion 1
    await expect(svc.move(id, lead, { to: 'Rejected', expectedVersion: 1, reason: '' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.move(id, lead, { to: 'Rejected', expectedVersion: 1, reason: '   ' })).rejects.toBeInstanceOf(BadRequestException);
    expect((await repo.findById(id))!.status).toBe('Triaged');
    expect(await repo.listComments(id)).toHaveLength(0);
    ```
  - |
    AC3 (service spec): rejecting with "Duplicate of DEF-12" sets Rejected.
    ```ts
    const out = await svc.move(id, lead, { to: 'Rejected', expectedVersion: 1, reason: 'Duplicate of DEF-12' });
    expect(out.status).toBe('Rejected');
    ```
  - |
    AC4 (workflow.spec.ts): Rejected offers nothing, for every role.
    ```ts
    for (const role of ['Developer', 'Tester', 'Lead'] as const)
      expect(availableMoves({ status: 'Rejected', ownerId: 'd1' }, { id: 'd1', role })).toEqual([]);
    ```
  - |
    AC5 (service spec, then e2e GET): the rejection reason is stored as a comment and returned on view.
    ```ts
    expect((await repo.listComments(id)).map(c => c.body).join('\n')).toContain('Duplicate of DEF-12');
    ```
    Component test: `expect(await screen.findByText(/Duplicate of DEF-12/)).toBeInTheDocument()` in the Comments card.
  - |
    AC6 and AC22 (service spec): empty and spaces-only reopen reason leaves Closed.
    ```ts
    await expect(svc.move(id, lead, { to: 'Triaged', expectedVersion: 1, reason: '  ' })).rejects.toBeInstanceOf(BadRequestException);
    expect((await repo.findById(id))!.status).toBe('Closed');
    ```
  - |
    AC7 (service spec): a Lead reopening with "Regression in 2.3" moves Closed to Triaged.
    ```ts
    const out = await svc.move(id, lead, { to: 'Triaged', expectedVersion: 1, reason: 'Regression in 2.3' });
    expect(out.status).toBe('Triaged');
    ```
  - |
    AC8 (service spec and component test): the reopen reason is shown as a comment.
    ```ts
    expect(out.comments.some(c => c.body.includes('Regression in 2.3'))).toBe(true);
    ```
  - |
    AC9 (workflow.spec.ts): a non-Lead is not offered reopen.
    ```ts
    expect(availableMoves({ status: 'Closed', ownerId: 'd1' }, { id: 't1', role: 'Tester' })).toEqual([]);
    ```
  - |
    AC10 (service spec): a failed fix on Resolved goes back to In progress.
    ```ts
    const out = await svc.move(id, tester, { to: 'In progress', expectedVersion: 1 });
    expect(out.status).toBe('In progress');
    ```
  - |
    AC11 (service spec): the owner marks In progress as Resolved.
    ```ts
    const out = await svc.move(id, { id: 'd1', role: 'Developer' }, { to: 'Resolved', expectedVersion: 1 });
    expect(out.status).toBe('Resolved');
    ```
  - |
    AC12 (workflow.spec.ts): neither owner nor Lead gets Resolved.
    ```ts
    const moves = availableMoves({ status: 'In progress', ownerId: 'd1' }, { id: 'x9', role: 'Developer' });
    expect(moves.map(m => m.to)).not.toContain('Resolved');
    ```
    Also a service test that submitting it anyway rejects with ForbiddenException and leaves the status.
  - |
    AC13 (service spec): a Tester verifies a Resolved defect.
    ```ts
    const out = await svc.move(id, tester, { to: 'Verified', expectedVersion: 1 });
    expect(out.status).toBe('Verified');
    ```
  - |
    AC14 (workflow.spec.ts): the owner who is a Developer is not offered Verified.
    ```ts
    expect(availableMoves({ status: 'Resolved', ownerId: 'd1' }, { id: 'd1', role: 'Developer' }).map(m => m.to)).not.toContain('Verified');
    ```
  - |
    AC15 (service spec): a Lead closes a Verified defect.
    ```ts
    const out = await svc.move(id, lead, { to: 'Closed', expectedVersion: 1 });
    expect(out.status).toBe('Closed');
    ```
  - |
    AC16 (workflow.spec.ts): a Tester is not offered Closed on Verified.
    ```ts
    expect(availableMoves({ status: 'Verified', ownerId: 'd1' }, tester).map(m => m.to)).not.toContain('Closed');
    ```
  - |
    AC17 (DefectPage.test.tsx): the status badge is shown for every status.
    ```tsx
    for (const status of ALL_STATUSES) {
      mockDefect({ status });
      render(<DefectPage id="d-1" />);
      expect(await screen.findByText(`Status: ${status}`)).toBeInTheDocument();
    }
    ```
  - |
    AC18 (workflow.spec.ts): a non-Lead is not offered Rejected on Triaged.
    ```ts
    expect(availableMoves({ status: 'Triaged', ownerId: null }, { id: 'd1', role: 'Developer' }).map(m => m.to)).not.toContain('Rejected');
    ```
  - |
    AC19 (workflow.spec.ts): a user who is neither Tester nor Lead is not offered In progress on Resolved.
    ```ts
    expect(availableMoves({ status: 'Resolved', ownerId: 'd1' }, { id: 'd1', role: 'Developer' }).map(m => m.to)).not.toContain('In progress');
    ```
  - |
    AC20 (workflow.spec.ts): a Lead is not offered Verified on Resolved.
    ```ts
    expect(availableMoves({ status: 'Resolved', ownerId: 'd1' }, lead).map(m => m.to)).not.toContain('Verified');
    ```
  - |
    AC23 (service spec, plus e2e against real Postgres): the second move from a stale version is refused. Service test with the fake repository, and the e2e test fires two sequential POSTs with the same `expectedVersion`.
    ```ts
    await svc.move(id, tester, { to: 'Verified', expectedVersion: 1 });
    await expect(svc.move(id, lead, { to: 'In progress', expectedVersion: 1 })).rejects.toBeInstanceOf(ConflictException);
    expect((await repo.findById(id))!.rowVersion).toBe(2);
    ```
    e2e: `expect(second.status()).toBe(409)`. Also a repository-level race test that two parallel `moveStatus(id, 1, ...)` calls yield exactly one `true`, and that a successful move bumps `row_version` by 1.
  - |
    AC24 (service spec, e2e and DefectPage.test.tsx): the 409 carries the current status and the screen shows it with the conflict banner.
    ```ts
    expect(conflict.getResponse()).toMatchObject({ currentStatus: 'Verified' });
    ```
    ```tsx
    expect(await screen.findByText('Status: Verified')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Another user changed this defect');
    ```
  - |
    UI offered-moves (StatusMovesCard, DefectPage.test.tsx): buttons are exactly `availableMoves` from the response, and a Rejected defect shows the no-moves text.
    ```tsx
    expect(screen.queryByRole('button', { name: 'Verify' })).not.toBeInTheDocument();
    expect(screen.getByText('No status move is available for a Rejected defect.')).toBeInTheDocument();
    ```
  - |
    UI reason form (ReasonForm.test.tsx): spaces-only submit shows the error, marks the field invalid and makes no request.
    ```tsx
    await user.type(screen.getByLabelText('Reason'), '   ');
    await user.click(screen.getByRole('button', { name: 'Reject defect' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a reason to reject this defect.');
    expect(screen.getByLabelText('Reason')).toHaveAttribute('aria-invalid', 'true');
    expect(postMove).not.toHaveBeenCalled();
    ```
  - |
    Plain-text comments (CommentsCard test): markup is shown as text, not parsed; line breaks are kept.
    ```tsx
    mockDefect({ comments: [{ body: '<b>x</b>\nsecond line' }] });
    expect(await screen.findByText(/<b>x<\/b>/)).toBeInTheDocument();
    expect(document.querySelector('.comment b')).toBeNull();
    ```
  - |
    Actor guard (current-actor.spec.ts): dev actor only when enabled, and never in production.
    ```ts
    expect(resolveActor({ AUTH_DEV_ACTOR: 'true', NODE_ENV: 'development' })).toEqual({ id: 'dev-lead', name: 'Dev Lead', role: 'Lead' });
    expect(resolveActor({ NODE_ENV: 'development' })).toBeNull();                       // default off, so 401
    expect(resolveActor({ AUTH_DEV_ACTOR: 'true', NODE_ENV: 'production' })).toBeNull();
    ```
  - |
    Verify is Tester-only on execution too (service spec): a non-Tester submitting Verified gets 403 and the status and version are unchanged.
    ```ts
    await expect(svc.move(id, lead, { to: 'Verified', expectedVersion: 1 })).rejects.toBeInstanceOf(ForbiddenException);
    expect((await repo.findById(id))!.rowVersion).toBe(1);
    ```
  - |
    Web e2e (apps/web/e2e/defect-status.spec.ts, Playwright), run with AUTH_DEV_ACTOR=true so the actor is the fixed Lead: seeded Triaged defect, Lead rejects with "Duplicate of DEF-12", page shows `Status: Rejected`, the comment, and no move buttons.
  - |
    Migration test (services/api/test/e2e): running the migration twice is idempotent and `INSERT INTO defects (key, title) VALUES ('DEF-1', 't')` defaults to status New.

assumptions_or_open_questions:
  - |
    Decided by the reviewer, applied: actor comes from a dev-only guard behind `AUTH_DEV_ACTOR` (default off) that injects a fixed Lead test user; all non-development environments must authenticate through Microsoft Entra ID. Still open and outside this story: Entra token validation and the mapping of token claims to Developer, Tester or Lead (no auth code exists in services/api/src, I read app.module.ts, main.ts and the health module). Until that lands, a non-dev deployment answers 401 on these endpoints. One role per user is assumed.
  - |
    Decided by the reviewer, applied: this story adds the minimal `defects` and `defect_comments` tables; the future create-defect story extends the schema. Until that story, e2e and dev data insert defect rows directly.
  - |
    Consequence of the fixed Lead dev actor: API e2e and web e2e can only exercise moves a Lead may make (Reject, Reopen, Close, Mark Resolved, Record failed fix). Tester-only Verify and owner-only paths are covered by unit tests with explicit actors; the plan adds no header or other way to switch role in the running app.
  - |
    The Lead is not offered Verify (AC20) and the Developer owner is not (AC14), so Verify is Tester-only. A Lead may also mark Resolved and record a failed fix per the item text.
  - |
    New → Triaged and Triaged → In progress are intentionally absent: the item says triage and owner assignment belong to the owner story, which builds on this one. Until that lands, only seeded defects reach Triaged or In progress. AC11 says "In progress with an owner", so the owner is read from `defects.owner_id`.
  - |
    Decided by the reviewer, applied: concurrency uses an integer `row_version` column. The client sends the `rowVersion` it loaded as `expectedVersion`; a mismatch is refused with 409 and a message telling the user to refresh and retry. This also covers a defect that moves A → B → A.
  - |
    Decided by the reviewer, applied: comments are plain text, shown with line breaks only, no HTML or rich text. The stored form is "Rejected: <reason>" or "Reopened: <reason>" (as in the prototype), authored by the acting user. Reasons are trimmed before saving. Not stated in the item and still assumed: a maximum reason length of 2000 characters (400 above that).
  - |
    Decided by the reviewer: the invalid `--duration-fast` and `--duration-spin` values (`[object Object]`, tokens.css lines 75-76) are a design-system defect to be raised with the design-system owner (I can't file it from this session, so a person needs to). The plan adds no local replacement. Transitions and the spinner and skeleton animations may not animate until the tokens are fixed; if that blocks implementation or tests, come back before adding any local value.
  - |
    The prototype shows role views via a "Signed in as <role>" caption; production gets the role from the actor, so the plan shows no such caption and does not add one. The prototype's sample data (DEF-14, Priya Shah, Dev Rao, Lead A.) is not carried into code; names come from the API.
  - |
    The Items list and routing do not exist; the web app has no router package. The plan opens a defect at `/items/:id` by parsing the path (no dependency), so the Items list story will need to link there or swap in a router.
  - |
    Project-wide deferred question (from TESTING-04-NOV-CHORE-013) on retention, backup and recovery of defects, change history and attachments: decided as a platform-level decision, left unresolved for this story. The existing PostgreSQL backup standards and AWS backup policies apply until project-wide retention requirements are defined. The new tables add no delete path and no retention logic.
  - |
    Existing test command includes the web unit tests with `include: ['src/**/*.test.{ts,tsx}']` and the API vitest run; the API specs in `src/**/*.spec.ts` and Playwright e2e under `test/e2e` need `DATABASE_URL` to a real Postgres for the PG repository and migration tests, which the unit command does not run.

estimated_points: 8

package_dependencies: []

notes: |
  ### Data & rollout
  - **Existing data**: the migration only creates two new tables (`defects`, `defect_comments`, with `defects.row_version integer NOT NULL DEFAULT 1`) with `IF NOT EXISTS`; it alters no existing rows (the database currently has no application tables, as services/api has no migrations or queries today). The status CHECK matches the seven statuses in the epic, so the owner and later stories add rows without changing it.
  - **Backfill / seed**: no backfill. The running system needs no seed, but dev and e2e tests insert defects directly (there is no create path yet). The migration runner is idempotent through `schema_migrations` and safe to re-run.
  - **Settings**: `DATABASE_URL` already exists (default in services/api/src/database/database.module.ts). New: `AUTH_DEV_ACTOR` (default unset, meaning off; when `true` outside production it injects the fixed Lead test user for local dev and tests only), documented in a short comment in `services/api/src/defects/current-actor.ts`. Web: API base URL via `VITE_API_BASE_URL`, default same-origin `/`, read in `apps/web/src/api/defects.ts`.
  - **Provisioning**: a Postgres database reachable via `DATABASE_URL`; `gen_random_uuid()` is built in from PostgreSQL 13. Real roles need Entra ID token validation and role mapping, which this story does not build (see open questions).
  - **Order and rollback**: run `pnpm migrate` in services/api BEFORE deploying the new Core API, then deploy API, then web. Rollback: redeploy the previous API/web; the two new tables are unused by old code and are safe to leave in place (a down step would be `DROP TABLE defect_comments; DROP TABLE defects;`, only if no real data was written).

  ### Design and tokens
  Read the approved prototype (single "Defect" screen with 12 states plus role variants). Tokens come from `design-system/tokens.css`; `apps/web/src/index.css` line 1 only imports tailwindcss today, so the plan adds the two design-system imports once there. Tailwind remains the confirmed styling tool, but this screen is built with the design-system classes the prototype uses, to match the approved design. The prototype's reject/reopen forms are in-page cards (not modals), which follows the guidelines (modal only for confirmations; Reject is final but is not styled `.btn-danger` in the approved design, so the plan keeps it `.btn-secondary` as drawn). The prototype's role captions ("Signed in as Lead") are explanatory, not UI.

  Data flow, touched modules highlighted:

  ```mermaid
  flowchart TD
    Page[DefectPage + ReasonForm + StatusMovesCard] -->|GET detail / POST status-moves| Api[api/defects.ts client]
    Api --> Ctl[DefectsController]
    Ctl --> Guard[ActorGuard / CurrentActor]
    Ctl --> Svc[StatusMoveService]
    Svc --> Wf[workflow.ts availableMoves]
    Svc --> Repo[PgDefectRepository]
    Repo --> Pool[PG_POOL in DatabaseModule]
    Mod[AppModule] --> DM[DefectsModule]
    DM --> Ctl
    Css[index.css imports design-system tokens] --> Page
    classDef touched fill:#f96,color:#000
    class Page,Api,Ctl,Guard,Svc,Wf,Repo,DM,Mod,Css touched
  ```
  `DatabaseModule`/`PG_POOL` (untouched) is reused as-is; `AppModule` only gains the `DefectsModule` import.

review_focus: |
  IN: the status workflow only (offered moves per status and role, Reject/Reopen with a required trimmed reason saved as a comment, optimistic refusal of stale moves) end to end in Core API, Postgres and the web "Defect" screen. OUT: triage and owner assignment (New → Triaged, Triaged → In progress), defect creation, the Items list, general comments and change history, real Entra authentication. Riskiest areas are the check order and atomic status-plus-comment write in `StatusMoveService`/`PgDefectRepository.moveStatus` (version conflict, then permission, then reason; nothing written on refusal), and the actor guard (the fixed Lead dev actor must stay off by default and ignored in production; real Entra authentication is an unbuilt dependency, so non-dev answers 401). Deliberate: the UI renders only the server's `availableMoves` (no client-side permission logic), Verify is Tester-only, concurrency uses `row_version`, comments are plain text rendered with line breaks only, and the invalid design-token durations are left for a design-system fix rather than patched locally.
