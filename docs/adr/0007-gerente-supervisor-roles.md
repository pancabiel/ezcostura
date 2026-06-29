# 0007. GERENTE and SUPERVISOR roles + admin-only user management

- **Status:** accepted
- **Date:** 2026-06-28

## Context

Until now the admin app had exactly one privileged login role, `ADMIN` (full
access), plus `OPERADOR` (the shop-floor *screen* only) and `OPERARIO_SELF` (the
operário portal, ADR-0006). There was **no way to create more login users** at
all — only the `admin/admin` user seeded by Flyway V3 existed, and no UI or API
to add others.

Factory owners need to delegate. They want to hand day-to-day operation to a
**manager** without giving away ownership of the account (the ability to create
other users), and to give a **shift supervisor** a dedicated login limited to the
shop-floor screen, without the cadastros/configurações.

## Decision

Add two new login roles and an **admin-only** user-management screen.

- **`GERENTE`** — everything `ADMIN` can do **except** managing users. Wherever a
  controller was `hasRole('ADMIN')` for an operational action (lotes, operários,
  jornadas, dias especiais, ausências CRUD; pack delete; reports), it becomes
  `hasAnyRole('ADMIN', 'GERENTE')`.
- **`SUPERVISOR`** — the facilitador screen only, read-only: **no reports**, and
  **cannot delete packs** (the `remover` button is hidden and `DELETE /api/packs`
  is `ADMIN`/`GERENTE` only). A distinct login tier from `OPERADOR` even though
  their effective access currently coincides.
- **User management** (`/api/usuarios`, `UsuarioController`) is `hasRole('ADMIN')`
  only. The admin can **only create `GERENTE` or `SUPERVISOR`** (validated
  server-side in `UsuarioService`), can activate/deactivate them, and reset their
  password. Mutations are refused on any non-(GERENTE/SUPERVISOR) account, which
  also makes admin self-lockout impossible.

Read endpoints needed by the global sync and the facilitador (lotes, operários,
jornadas, dias especiais, ausências, alocações, packs `GET`) are opened to all
internal roles: `hasAnyRole('ADMIN', 'GERENTE', 'SUPERVISOR', 'OPERADOR')`. This
also **fixed a latent bug**: `LoteController` was `hasRole('ADMIN')` at the class
level, so the always-on sync's `pullLotes()` 403'd for any non-admin session
(aborting the whole sync) — a `SUPERVISOR`/`OPERADOR` facilitador could never get
the lotes it needs to register a pack. The class annotation was split into broad
`GET` / restricted CUD.

User management is **online-only** — it is not a Dexie-synced entity (ADR-0003).
It is a rare, sensitive administrative action always performed online, so it
avoids the offline sync machinery entirely.

## Alternatives considered

- **One "manager" role only** — rejected; the owner explicitly wanted a narrower
  shift-supervisor tier (facilitador + reports) distinct from a near-admin
  manager.
- **Reuse `OPERADOR` for the supervisor** — rejected; `OPERADOR` has no reports
  access and the meaning ("shop-floor screen") shouldn't silently widen.
- **Make user management a synced entity** — rejected; credentials should not sit
  in IndexedDB nor flow through the generic push/pull path.
- **Let admin create any role (incl. ADMIN)** — rejected for now; constraining
  creation to GERENTE/SUPERVISOR keeps a single owner account and removes the
  self-lockout and privilege-escalation foot-guns. Revisit if multi-owner is
  needed.

## Consequences

- The system now has **five roles**: `ADMIN`, `GERENTE`, `SUPERVISOR`,
  `OPERADOR`, `OPERARIO_SELF`. The `users.role` CHECK constraint was widened in
  V12 (`ADMIN`, `GERENTE`, `SUPERVISOR`, `OPERADOR`).
- Authorization is expressed as inline `@PreAuthorize` strings spread across
  controllers (matching existing convention). The role lists are duplicated per
  endpoint — a future cleanup could centralize them into meta-annotations.
- There is still no second `ADMIN`: the seeded admin remains the sole owner.
  Recovering a lost admin password is still a manual DB operation (as before).
- Inherits the JWT no-revocation limitation (ADR-0005): deactivating a user
  blocks new logins/refreshes but an already-issued access token stays valid until
  it expires.
