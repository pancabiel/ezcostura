# 0003. Offline-first: Dexie as source of truth + hand-rolled sync

- **Status:** accepted
- **Date:** 2026-06-28

## Context

Operators use tablets on a factory floor with flaky/no wifi. Reads must never
block on the network, and writes made offline must survive and sync later. This
makes offline-first a **product requirement**, not a preference.

Given that, the UI reads/writes a local store (Dexie / IndexedDB) as its source
of truth, and a sync layer reconciles with the server when online.

## Decision

- **Dexie (IndexedDB) is the source of truth for the UI.** Every entity carries
  `id` (local UUID), `serverId`, `syncStatus`, `updatedAt`, and optional
  `syncError` / `pendingDelete`.
- **Sync is hand-written** (`services/syncService.ts`): a 5s timer (or `online`
  event) pushes every table, then pulls the global ones; alocações and packs are
  date-scoped and pulled per-page on mount. FK fields are translated local
  `id` → `serverId` on push.

## Alternatives considered

- **Off-the-shelf sync engines** (PouchDB/CouchDB, RxDB, WatermelonDB,
  ElectricSQL, Replicache) — not adopted. **Honest history:** these weren't on
  the radar when the project started, so they were never actually evaluated up
  front. **In hindsight** they were still the wrong fit: each drags in its own
  backend and data model that would fight the existing Spring + Postgres +
  schema-per-tenant backend, and the app's real sync needs are simple
  (last-write-wins per entity, push-then-pull over the REST API that already
  exists). So there is no plan to migrate.
- **Server-authoritative (no local store)** — rejected by the offline-first
  requirement above.

## Consequences

- Reads are instant and offline-safe; sync is just reconciliation, not the
  critical path.
- **The hard part is FK id translation:** new entities use their local UUID as
  the server id on first POST; later pushes must map local `id` → `serverId`
  (`serverIdOrLocal()`, `findLocalByServerId()`). Forgetting this corrupts
  relationships — the main source of sync bugs.
- Conflict resolution is last-write-wins per entity; no merge. Acceptable
  because a given pack/allocation is effectively owned by one operator/device.
- Dexie schema changes require bumping the `version(N).stores({...})` chain
  (never mutate an existing version).
- We own all sync behaviour ourselves — no library to lean on, but also no
  framework constraints. Decision is settled, not under review.
