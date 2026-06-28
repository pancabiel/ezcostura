# Implementation workflow

How to build new things in ezcostura without tripping the project's known
landmines. Pick a **track** by the size of the change, run the **loop**, and tick
the **landmine checklist** before you ship.

The `/feature` skill drives this interactively; this file is the reference.

## Pick a track

| Change | Track |
| ------ | ----- |
| Copy, styling, one-liner | **Trivial** — just do it, then `typecheck`. Skip the rest. |
| Feature within existing patterns | **Standard** — phases 1 (light) → 3 → 4 → 5 → 6 → 7. |
| Architectural / data-model / auth | **Deep** — the full loop, including ADR + `/security-review` + `test:full`. |

## The loop

### 1. Shape — `/grilling`
Stress-test the idea before writing code. Walk the design tree, resolve each
decision, kill ambiguity. For anything non-trivial, plan first. If a question is
answerable from the codebase, answer it from the codebase.

### 2. Record (Deep track) — ADR + glossary
If the decision is non-obvious or architectural, write an ADR in
[`adr/`](adr/) (copy `adr/0000-template.md`, next number, add to the index).
New domain word → add to [`glossary.md`](glossary.md).

### 3. Build — `/run`
Implement, respecting the landmines below. Keep the app running while you work so
you see feedback fast. For backend logic with a clear contract, TDD is a good fit.

### 4. Gate (must pass)
- Frontend: `cd frontend ; npm run typecheck`
- Backend: `cd backend ; mvn test`

### 5. Review
- `/code-review` — correctness bugs first.
- `/simplify` — reuse/simplification/efficiency cleanup.
- `/security-review` — **required on the Deep track** or whenever auth, tenancy,
  or untrusted input is touched.

### 6. Verify — `/verify`
Watch it actually work, not just green unit tests. Needs the full stack running
(Postgres + backend + frontend):
- `cd e2e ; npm run test:smoke` — fast, every admin route, fails on console error.
- `cd e2e ; npm run test:full` — full data path; use it for data-model/sync changes.

### 7. Ship
Commit on a branch (never straight to `main`) → PR.

## 🧨 Landmine checklist

Run through this before phase 5. These are the mistakes that have actually hurt
this codebase:

- [ ] **DB schema changed?** New *immutable* Flyway `V*__*.sql` (runs per tenant,
      no cross-schema refs). Almost always also a **Dexie version bump** in
      `frontend/src/db/dexie.ts`.
- [ ] **New synced entity/field?** Added to Dexie `stores({...})` **and**
      `syncService.ts` push/pull **and** local-`id`→`serverId` FK translation
      (`serverIdOrLocal()` / `findLocalByServerId()`). See ADR-0003.
- [ ] **New controller→repository call?** Wrapped in
      `ReactiveTenantHelper.runBlocking(...)`, or the tenant is invisible. See
      ADR-0002.
- [ ] **New FK into an aggregate child table?** Chose *deferral vs snapshot*
      deliberately. See ADR-0004.
- [ ] **New architectural decision / domain term?** ADR / glossary updated.
- [ ] **CORS / secrets?** Never wildcard; `prod` profile fails fast if unset.
- [ ] **Auth / tenancy / input touched?** Ran `/security-review`.
