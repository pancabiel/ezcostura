# 0002. WebFlux outside, blocking JDBC inside

- **Status:** accepted
- **Date:** 2026-06-28

## Context

The runtime load profile is many tablets that are mostly offline, but when
online each polls `/api` every ~5s to sync — lots of cheap, concurrent,
I/O-bound requests against one small VM. At the same time the data layer needs
Spring Data JDBC's aggregate mapping (`@MappedCollection`) and the per-tenant
**schema** routing, neither of which R2DBC handles cleanly.

## Decision

Run **Spring WebFlux** on the outside (controllers return `Mono<T>` / `Flux<T>`)
and **blocking Spring Data JDBC** on the inside. Bridge the two with
`ReactiveTenantHelper.runBlocking(...)`, which copies `tenantId` from the Reactor
`Context` into a `ThreadLocal` and runs the blocking JDBC call on
`Schedulers.boundedElastic()`. Every controller→repository hop goes through this
helper.

## Alternatives considered

- **Plain Spring MVC** — would make blocking JDBC natural with no bridge, but
  thread-per-request handles the many-idle-poller concurrency far worse on a
  small VM than WebFlux's event loop.
- **Full reactive (WebFlux + R2DBC)** — rejected: R2DBC does not cleanly support
  Spring Data JDBC aggregates or the per-tenant schema routing the app relies on.

## Consequences

- Event-loop concurrency for the polling load on few threads; JDBC isolated onto
  `boundedElastic` so it never blocks the event loop.
- **Discipline tax:** every controller→repo call MUST go through
  `ReactiveTenantHelper.runBlocking`, otherwise the routing DataSource sees no
  tenant. This is the single easiest mistake to make in the backend.
- Two mental models in one codebase (reactive edge, imperative core) — a known
  cost accepted for the load fit + data-layer needs.
