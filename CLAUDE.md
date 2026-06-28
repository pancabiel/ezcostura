# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Multi-tenant SaaS for clothing-factory production tracking ("ezcostura"). Operators register packs of finished pieces from a shop floor on tablets — works offline, syncs when online. Deployed as Docker, multiple tenants in one Postgres (schema-per-tenant).

UI is in Brazilian Portuguese; domain terms in code are Portuguese (`lote` = batch, `operario` = operator, `alocacao` = allocation, `pack`, `jornada` = work-shift schedule, `ausencia` = absence, `facilitador` = shop-floor screen). Full term list in [`docs/glossary.md`](docs/glossary.md).

The **why** behind the non-obvious architectural decisions lives in [`docs/adr/`](docs/adr/) (Architecture Decision Records) — read these before changing tenancy, the WebFlux/JDBC split, sync, the Spring Data JDBC FK workarounds, or auth.

To build a new change, follow [`docs/WORKFLOW.md`](docs/WORKFLOW.md) (pick a track → shape → build → gate → review → verify → ship, with a project-specific landmine checklist). The `/feature` skill drives it interactively.

## Common commands

### Backend (Maven, run from `backend/`)
```powershell
mvn spring-boot:run                 # dev, default profile
mvn -DskipTests package             # build fat-jar
mvn test                            # run tests
mvn -Dtest=ClassName#method test    # single test
```
Backend on `:8080`. Requires Postgres — `docker compose up -d postgres` from repo root.

### Frontend (run from `frontend/`)
```powershell
npm install
npm run dev          # Vite on :5173, proxies /api → :8080
npm run build        # tsc -b && vite build (PWA assets in dist/)
npm run typecheck    # tsc -b --noEmit
npm run preview      # serve built dist
```
No test runner is wired up; `typecheck` is the lint/type gate.

### End-to-end (Playwright + Firefox, run from `e2e/`)
```powershell
npm test               # all specs
npm run test:smoke     # ~5s — login + visit every admin route, fail on any console error
npm run test:full      # ~15s — jornada (with Friday override) → operário → dia especial → lote → pack → verify report
npm run test:headed    # same, browser visible
```
Requires Postgres + backend + frontend dev all running. Drives the **real** UI; verifies sync into the DB and that reports render the production. Uses Firefox so no Chrome dependency. See `e2e/README.md`.

### Full stack
```powershell
cp .env.example .env && $EDITOR .env
docker compose up -d postgres
cd backend  ; mvn spring-boot:run
cd frontend ; npm run dev
```
Default seeded login: tenant `demo`, user `admin`, password `admin` (Flyway `V3`). Backend logs a `SECURITY:` warning until changed; `prod` profile refuses to start with the default admin unless `ezcostura.security.allow-default-admin=true`.

## Architecture

### Multi-tenancy (backend)
The whole tenancy model is non-obvious — read these together if touching tenancy:
- `auth/JwtAuthFilter` — extracts `tenantId` from the JWT and writes it into Reactor `Context` under `TenantContext.CONTEXT_KEY`.
- `config/ReactiveTenantHelper.runBlocking(...)` — bridge that copies `tenantId` from Reactor context into a `ThreadLocal` and runs the blocking JDBC call on `Schedulers.boundedElastic()`. **All controller → repository hops must go through this helper**, otherwise the routing DataSource sees no tenant.
- `config/TenantRoutingDataSource` — extends `AbstractRoutingDataSource`; one HikariCP pool per tenant, JDBC URL gets `?currentSchema=tenant_<id>` and connections run `SET search_path TO tenant_<id>` on init. Tenant pools are created lazily by `registerTenant()`.
- `config/MultiTenantFlywayMigrator` — on `ApplicationReadyEvent` discovers existing `tenant_*` schemas, creates any from `ezcostura.tenants.initial`, and runs Flyway against each. **Spring's auto Flyway is disabled** (`spring.flyway.enabled=false`).
- Migrations in `backend/src/main/resources/db/migration/V*.sql` run **per tenant schema** — never reference cross-schema objects.

### Stack split — WebFlux + blocking JDBC
The backend is **WebFlux on the outside, JDBC on the inside**. Controllers return `Mono<T>` / `Flux<T>`; service/repository layers are blocking (Spring Data JDBC). Always wrap blocking work in `ReactiveTenantHelper.runBlocking(() -> ...)` — it both schedules off the event loop **and** propagates the tenant. Don't block on the event-loop thread.

### Spring profiles
- (default) — local dev, env-driven defaults that work for `docker compose up postgres`.
- `prod` — no defaults; fails fast if `DB_*`, `JWT_SECRET`, `EZCOSTURA_CORS_ORIGINS` are unset (`application-prod.yml`).

### Auth
- Stateless JWT (HS256, jjwt). `JwtService` rejects secrets <32 bytes.
- Refresh-token rotation; each `/api/auth/refresh` issues a new pair.
- BCrypt cost 12. CSRF disabled (no cookies).
- CORS allowlist enforced; `CorsConfig` throws on startup if `*` is configured.
- Frontend `lib/axios.ts` injects `Authorization` header and on 401 calls `/api/auth/refresh` once (de-duped via a shared `refreshing` promise) before logging out.
- Roles: `ADMIN` (full access), `OPERADOR` (only the shop-floor screen), and `OPERARIO_SELF` (operário portal — sees only their own data; see ADR-0006).

### Spring Data JDBC aggregate gotcha
This bit the project hard — see `V8` and `V9` migrations:
- Spring Data JDBC with `@MappedCollection` saves an aggregate by **deleting and reinserting all child rows** — even when child IDs are unchanged.
- Any FK from another table into a child table (`alocacoes.operacao_id` → `lote_operacoes.id`) blocks the intermediate DELETE step. Fix: declare the FK `DEFERRABLE INITIALLY DEFERRED` (V9).
- Where the delete is *real* and not just a phantom reinsert — `packs` referencing `alocacoes`, where an allocation genuinely gets deleted but the pack must survive as history — deferral can't help. Instead drop the FK (V8 drops `packs_alocacao_id_fkey`) and **snapshot the referenced fields onto the row** (V8: `pack.lote_id`, `operacao_id`, `lote_codigo`, `operacao_nome`). `PackService.create` populates these from the lote on the server, ignoring client-derived values. Rule of thumb: *deferral for phantom deletes, snapshot for real deletes* (see ADR-0004).

### Offline-first sync (frontend)
- Dexie (IndexedDB) is the source of truth for the UI; reads never block on network.
- Every entity has `id` (local UUID), `serverId`, `syncStatus: 'pending' | 'synced' | 'error'`, `updatedAt`, optional `syncError`, optional `pendingDelete`.
- `services/syncService.ts` runs on a 5s timer (or `online` event). Order: push every table, then pull the global ones (jornadas/lotes/operários/diasEspeciais/ausências). Alocações and packs are date-scoped — pages call `pullAlocacoesForDate` / `pullPacksForDate` (or the `*ForRange` variants) on mount.
- Push payloads must translate **local `id` → `serverId`** for any FK (`operarioId`, `loteId`, `alocacaoId`, `jornadaId`); see `serverIdOrLocal()` and `findLocalByServerId()` in `syncService.ts`. New entities use the local UUID as the server id on first POST.
- Dexie schema versioning: bump the `this.version(N).stores({...})` chain in `db/dexie.ts` rather than mutating an existing version. Add an `.upgrade(...)` if you need to migrate cached data; otherwise just resync from backend.
- Service worker (`vite-plugin-pwa` Workbox): `/api/*` is `NetworkOnly` — sync logic, not the SW, owns offline behaviour.

### Frontend feature layout
`frontend/src/features/<entity>/` consistently has:
- `<entity>Api.ts` — thin axios wrapper around `/api/<entity>`
- `<entity>Repo.ts` — Dexie reads/writes; what the UI imports
- one or more `*Page.tsx` / `*Modal.tsx` components

UI is built with **shadcn/ui** (`radix-nova` style, `lucide` icons — see `frontend/components.json`). Reusable primitives live in `frontend/src/components/ui/` (button, input, select, dialog, card, field, …). Compose pages from these; don't hand-roll Tailwind for things a primitive already covers. To add a new primitive use the `/shadcn` skill rather than authoring the file by hand. Note: requires React 19 (older React triggers ref warnings that fail e2e), and Radix `<Select>` needs the `selectRadix()` helper in e2e.

`stores/authStore.ts` (zustand, persisted to localStorage) holds the JWT session. `stores/syncStore.ts` exposes sync phase + pending counts to `SyncStatusBadge`.

### Routes (frontend)
| Route          | Purpose                                                     |
| -------------- | ----------------------------------------------------------- |
| `/login`       | Tenant + username + password                                |
| `/facilitador` | Shop-floor tablet screen — register a pack in ≤ 3 taps      |
| `/gerenciador` | Daily planner — per-operator allocations                    |
| `/lotes`       | Batches CRUD with dynamic operations and sizes              |
| `/operarios`   | Operators CRUD, active/inactive filter                      |
| `/relatorios`  | Per-operator and per-batch totals over a period             |

## Conventions

- Domain code is Portuguese; keep new entity/field names in Portuguese to match (`lote`, `operacao`, `tamanho`, `pack`, `alocacao`, `jornada`, `ausencia`).
- DTOs are Java records under `<feature>/dto/`; mappers are static methods on `<Entity>Mapper`.
- Migrations are immutable Flyway `V*__*.sql` files — add a new version, never edit a shipped one. They run against every tenant schema.
- New UI uses shadcn/ui primitives from `src/components/ui/` (add via the `/shadcn` skill) — not raw markup or ad-hoc Tailwind components.
- Frontend never uses `*` for CORS or wildcards; the backend will refuse to boot.
- Don't expose Postgres on a public interface — `docker-compose.yml` deliberately binds to `127.0.0.1`.
