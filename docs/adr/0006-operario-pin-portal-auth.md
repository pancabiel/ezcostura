# 0006. Operário PIN/CPF auth + portal

- **Status:** accepted
- **Date:** 2026-06-28

## Context

Operators are not admins and work on shared shop-floor tablets. Expecting each
one to type a username + strong password to check their own production numbers is
hostile UX they would not use. Their **CPF** is already their identity in the
system. We want them to authenticate in seconds, on their own phone, to see only
their own desempenho — without giving them any access to the admin app.

## Decision

Add a **separate, deliberately lightweight auth path** alongside the
username/password admin auth (ADR-0005):

- **Identifier = CPF** (normalized to digits), **secret = numeric PIN**
  (BCrypt-hashed in `operarios.pin_hash`). `pin_hash IS NULL` means the operator
  has **no portal access** — access is opt-in (V10). A partial unique index
  enforces CPF uniqueness only among operators who have a PIN.
- Initial PIN is admin-assigned; operators can rotate it via `changePin`
  (requires the current PIN).
- Successful login issues stateless JWTs (same scheme as ADR-0005) under a
  dedicated role **`OPERARIO_SELF`** — distinct from `OPERADOR` (the
  facilitador/shop-floor screen). The portal authorizes only `OPERARIO_SELF`, so
  operators see only their own data and never the admin app.

## Brute-force defense (two layers)

A numeric PIN is guessable, so one layer is not enough:

1. **Per-account lockout** (`OperarioAuthService`): 5 failed attempts → account
   locked 30 minutes (`pin_locked_until`).
2. **Per-IP throttle** (`OperarioLoginRateLimitFilter`): 10 attempts/min/IP →
   429. This exists *specifically because* CPF is guessable — without it an
   attacker could sweep many different CPFs from one IP and never trip any single
   account's lockout. Fixed 1-minute window, in-memory counter, reads the first
   `X-Forwarded-For` hop (behind Caddy).

## Alternatives considered

- **Give each operator a normal username+password account** — rejected as
  hostile UX they would not adopt on shared tablets.
- **Reuse the existing `OPERADOR` role for the portal** — rejected; `OPERADOR` is
  the shop-floor *screen* role. A self-service portal viewing personal data is a
  different authorization scope, hence the new `OPERARIO_SELF` role.

## Consequences

- Fast, low-friction operator access; admin surface stays fully separated by
  role.
- The system now has **three roles**: `ADMIN`, `OPERADOR`, `OPERARIO_SELF`.
  (Note: `CLAUDE.md` still lists only `ADMIN`/`OPERADOR` — update it.)
- PIN auth is weaker than password auth by design; the two-layer throttle is the
  compensating control. The per-IP counter is in-memory, so it resets on restart
  and is per-instance (fine for the single-VM deploy; revisit if scaled out).
- Inherits the same no-revocation refresh limitation as ADR-0005.
