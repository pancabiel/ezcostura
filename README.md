# ezcostura

Production-tracking SaaS for clothing factories (*facções de roupas*). Operators register packs of finished pieces from the shop floor on a tablet — works offline, syncs when back online — and the owner gets per-operator / per-batch productivity reports in real time.

Designed multi-tenant from day one (schema-per-tenant on Postgres) so the same instance can serve multiple factories.

> **Stack:** Java 21 · Spring Boot 3 (WebFlux) · Spring Security + JWT · PostgreSQL · Flyway · React 18 · Vite · TypeScript · Tailwind · Dexie (IndexedDB) · Workbox PWA · Zustand · Docker

---

## Why this project exists

A small clothing factory (the "first customer") needed to replace handwritten paper sheets used to track who finished how many pieces of each batch. Constraints that shaped the architecture:

- **Tablet-first, offline-first.** Wi-Fi inside the factory is unreliable. Registering a pack must work with no connection and must take **≤ 3 taps**.
- **Multi-tenant from v1.** The owner intends to sell the same product to other facções later. Bolt-on multi-tenancy is painful, so it was built in from the start.
- **Two deployment modes:**
  1. **SaaS** — Docker / cloud, multiple tenants in one Postgres.
  2. **Desktop edition** — a single self-contained Windows bundle (Spring Boot + embedded Postgres + jlinked JRE) for customers without internet, double-clickable, no Docker required.

---

## Architecture at a glance

```
┌──────────────────────┐         ┌─────────────────────────────────────┐
│   React + Vite PWA   │         │       Spring Boot 3 (WebFlux)       │
│  ─ Zustand state     │  HTTPS  │  ─ JWT auth filter (tenantId claim) │
│  ─ Dexie / IndexedDB │ ──────▶ │  ─ Routing DataSource per tenant    │
│  ─ Workbox SW        │ <══════ │  ─ Flyway runs per-schema on boot   │
│  ─ Axios + sync loop │         │  ─ JDBC repositories                │
└──────────────────────┘         └────────────────┬────────────────────┘
        Offline-first                              │
        IndexedDB → backend                        ▼
                                       ┌─────────────────────┐
                                       │  PostgreSQL 16      │
                                       │  schema-per-tenant  │
                                       │  tenant_demo, …     │
                                       └─────────────────────┘
```

### Multi-tenancy

- JWT carries `tenantId`. The `JwtAuthFilter` reads it and stores it in Reactor `Context`.
- A `ReactiveTenantHelper` bridges Reactor context → `ThreadLocal` for the blocking JDBC layer.
- `TenantRoutingDataSource` (extends `AbstractRoutingDataSource`) routes each connection to a tenant-pinned HikariCP pool with `currentSchema=tenant_<id>` and `SET search_path` on init.
- On boot, `MultiTenantFlywayMigrator` discovers existing `tenant_*` schemas and runs Flyway migrations against each one.

### Offline-first sync

- Every write hits IndexedDB (Dexie) first with `syncStatus: 'pending'`.
- A background loop pushes pending writes, then pulls remote deltas.
- Reads always come from IndexedDB, so the UI never blocks on network.
- Each entity carries `id` (local UUID), `serverId`, `syncStatus` (`pending` | `synced` | `error`), `updatedAt`.

### Roles

- `ADMIN` — full access (catalogues, planner, reports, shop-floor screen).
- `OPERADOR` — only the shop-floor screen (register packs, inline allocation).

---

## Screens

| Route             | Purpose                                                                   |
| ----------------- | ------------------------------------------------------------------------- |
| `/login`          | Auth by tenant + username + password.                                     |
| `/facilitador`    | **Tablet-first** main screen. Active operators, current allocation, daily totals. `+ Pack` in ≤ 3 taps. |
| `/gerenciador`    | Daily planner — per-operator allocations.                                 |
| `/lotes`          | Batches CRUD with dynamic operations and sizes.                           |
| `/operarios`      | Operators CRUD with active/inactive filter.                               |
| `/relatorios`     | Per-operator and per-batch totals over a period.                          |

---

## Running locally (dev)

### 1 · Configure secrets

```bash
cp .env.example .env
# Generate strong secrets:
#   openssl rand -base64 24   →  DB_PASSWORD
#   openssl rand -base64 48   →  JWT_SECRET
$EDITOR .env
```

### 2 · Database + backend (Docker)

```bash
docker compose up -d postgres
cd backend && mvn spring-boot:run
```

Backend boots on `http://localhost:8080`, auto-creates schema `tenant_demo`, runs Flyway migrations.

### 3 · Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend on `http://localhost:5173` with `/api` proxied to the backend.

### 4 · Log in

Default credentials seeded by Flyway `V3` per tenant:

| Field      | Value     |
| ---------- | --------- |
| Tenant     | `demo`    |
| Username   | `admin`   |
| Password   | `admin`   |

> **Change this on first login.** The backend logs a `SECURITY:` warning every startup while the default password is still in use, and the `prod` profile refuses to start unless you either change it or set `ezcostura.security.allow-default-admin=true`.

---

## Running in production

Use the `prod` Spring profile — it has **no defaults** for secrets and fails fast if any are missing.

```bash
cp .env.example .env && $EDITOR .env   # set every variable
docker compose --profile "" up -d --build
```

Required env vars (see `.env.example` for the full list):

- `DB_NAME` / `DB_USER` / `DB_PASSWORD`
- `JWT_SECRET` — at least 32 bytes of entropy
- `EZCOSTURA_CORS_ORIGINS` — explicit list, **no `*`**

### Production checklist

- [ ] Run behind a TLS terminator (nginx, Caddy, ALB) — the backend itself does HTTP.
- [ ] `JWT_SECRET` is at least 48 random bytes, stored in a real secret manager.
- [ ] `EZCOSTURA_CORS_ORIGINS` lists only your real frontend hosts.
- [ ] Default `admin/admin` password changed; `ezcostura.security.allow-default-admin=false`.
- [ ] Postgres bound to a private network (the included `docker-compose.yml` binds to `127.0.0.1` only).
- [ ] Backups configured for the `postgres-data` volume.
- [ ] Flyway migrations reviewed before deploy (they run automatically on boot).

---

## Desktop edition (single-PC install)

For customers without internet or Docker. Builds a portable Windows bundle: Spring Boot fat-jar + embedded Postgres (Zonky) + a minimal JRE produced with `jlink`.

```powershell
cd installer
.\build.ps1                # portable folder under installer\dist\ezcostura\
.\build.ps1 -Installer     # also produces .exe (requires WiX 3 on PATH)
```

A per-installation JWT secret is generated on first run and persisted to `%APPDATA%\ezcostura\jwt.secret` — no shared key in the binary. Database lives in `%APPDATA%\ezcostura\pgdata`.

See [`installer/README.md`](installer/README.md) for details.

---

## Security notes

- **JWT secret validation.** `JwtService` refuses any secret shorter than 32 bytes and any blank value — no silent zero-padding.
- **CORS allowlist.** No wildcards permitted; `CorsConfig` throws on startup if `*` is configured.
- **Stateless API.** No server-side sessions. CSRF disabled because there is no cookie auth.
- **BCrypt** (cost 12) for password hashing.
- **Refresh-token rotation.** Each refresh issues a new access + refresh pair.
- **Default-admin guard.** Startup logs a warning whenever any tenant still has the seeded `admin/admin` user; `prod` profile can be configured to refuse to start in that state.
- **Per-tenant connection pools** — no risk of cross-tenant data leaks via a misrouted query because each pool is pinned to one schema.

What is **not** in scope yet (PRs welcome):

- In-app user CRUD (today, additional users are seeded by SQL).
- Rate limiting on `/api/auth/*`.
- TLS termination inside the backend (use a reverse proxy).
- Audit log of administrative actions.

---

## Project layout

```
backend/
  src/main/java/com/ezcostura/
    EzcosturaApplication.java
    auth/         # JWT auth, security config, default-admin guard
    config/       # tenant routing, per-tenant Flyway, CORS, error handling
    desktop/      # standalone Windows entrypoint (embedded Postgres)
    lote/         # batches CRUD
    operario/     # operators CRUD
    alocacao/     # allocations (per-day per-operator planning)
    pack/         # pack registration + reporting aggregates
    jornada/      # working hours / shift breaks
    ausencia/     # absences (sick / vacation / day off)
    relatorio/    # aggregated reports
  src/main/resources/
    application.yml          # base config (env-driven)
    application-prod.yml     # prod profile — no defaults
    application-desktop.yml  # desktop profile — embedded Postgres
    db/migration/V*.sql      # Flyway migrations (run per-tenant)

frontend/
  src/
    components/   # Layout, ProtectedRoute, DateNav, SyncStatusBadge
    db/dexie.ts   # IndexedDB schema
    features/
      auth/       # LoginPage
      lotes/      # list, form, repo, api
      operarios/  # list, form, repo, api
      alocacoes/  # GerenciadorPage, AlocacaoModal, repo, api
      packs/      # PackModal, repo, api
      facilitador/# FacilitadorPage (tablet-first main screen)
      relatorios/ # RelatoriosPage
    lib/axios.ts  # JWT injection + 401-refresh interceptor
    services/syncService.ts
    stores/       # authStore, syncStore
    types/        # lote, operario, alocacao, pack

installer/        # PowerShell script that builds the desktop bundle
docker-compose.yml
.env.example
```

---

## Roadmap

- [ ] In-app user management (create OPERADOR users without SQL)
- [ ] Pre-defined shift periods (Manhã 1, Tarde 1) replacing the free time picker
- [ ] Real-vs-target productivity comparison in reports (data already in the model)
- [ ] Push notifications for sync errors + custom service-worker upload queue
- [ ] Rate limiting on auth endpoints

---

## License

This is a portfolio project. Reach out before using it commercially.
