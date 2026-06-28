# 0001. Schema-per-tenant multi-tenancy

- **Status:** accepted
- **Date:** 2026-06-28

## Context

The product is a multi-tenant SaaS where each tenant is a separate clothing
factory, all sharing one Postgres instance on one small VM. Tenants' production
data must stay strictly separated. The expected number of tenants is small (a
handful), not thousands.

## Decision

Isolate each tenant in its own Postgres **schema** (`tenant_<id>`). Application
schema objects are identical per tenant; routing picks the schema at request
time from the JWT's `tenantId` (see `TenantRoutingDataSource`, one HikariCP pool
per tenant; `search_path` set per connection).

## Alternatives considered

- **Row-level discriminator (`tenant_id` column + filter on every query)** —
  rejected. It is one missing `WHERE` clause away from a cross-tenant data leak,
  which is unacceptable for separate factories' production data. Isolation would
  rely entirely on never making that mistake.
- **Database-per-tenant** — rejected as overkill for the expected handful of
  tenants on a single small VM; more operational weight (separate DBs, roles,
  connection management) than the isolation gain is worth at this scale.

## Consequences

- **Hard isolation:** a tenant can never see another's rows even if a query
  forgets its filter — there is no shared table to leak across. Bug blast radius
  is a single schema.
- **Per-tenant operational fan-out:** migrations run per schema
  (`MultiTenantFlywayMigrator`, Spring's auto-Flyway disabled), and there is one
  connection pool per tenant. Migrations must never reference cross-schema
  objects.
- **Lazy tenant provisioning:** tenant pools/schemas are created on demand
  (`registerTenant`) or seeded from `ezcostura.tenants.initial`.
- Scaling to very large tenant counts would eventually strain pool-per-tenant;
  acceptable given the expected scale.
