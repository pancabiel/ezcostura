# Architecture Decision Records

Each file records one non-obvious decision and **why** it was made — the reasoning
that doesn't survive in code. Format is MADR-lite. Files are immutable once
accepted; to reverse a decision, add a new ADR that supersedes the old one.

## Index

| #    | Decision | Status |
| ---- | -------- | ------ |
| 0001 | Schema-per-tenant multi-tenancy | ✅ accepted |
| 0002 | WebFlux outside, blocking JDBC inside | ✅ accepted |
| 0003 | Offline-first: Dexie as source of truth + hand-rolled sync | ✅ accepted |
| 0004 | Working around the Spring Data JDBC delete-reinsert quirk | ✅ accepted |
| 0005 | Stateless JWT with refresh-token rotation | ✅ accepted |
| 0006 | Operário PIN/CPF auth + portal | ✅ accepted |
| 0007 | GERENTE + SUPERVISOR roles & admin-only user management | ✅ accepted |
| 0008 | Tonalidade as a tamanho × tonalidade matrix | ✅ accepted |

## Backlog (capture opportunistically)

- Per-tenant Dexie database via `getDb`
- Tenant id normalized to lowercase
- `tamanho` moved onto `pack` (V7)
- Multiple jornadas + DiaEspecial modeling (V6)
- PWA service worker `NetworkOnly` for `/api`
- Firefox-only E2E
- Hetzner single-VM deploy topology
- Sentry + global error handling
