# 0005. Stateless JWT with refresh-token rotation

- **Status:** accepted
- **Date:** 2026-06-28

## Context

Auth runs on WebFlux on a single small VM, serving offline/poll-heavy tablet
clients. We need authentication that doesn't add a stateful store or per-request
lookups.

## Decision

Use **stateless JWT** (HS256, jjwt). `JwtService` rejects secrets <32 bytes.
Login issues an access token + a refresh token. `/api/auth/refresh` validates the
refresh token (signature + `type == "refresh"`), re-checks the user is still
active, and issues a **new pair** (`AuthService.refresh`). No token state is
stored server-side. Roles are `ADMIN` and `OPERADOR`. CSRF is disabled (no
cookies; tokens go in the `Authorization` header).

## Alternatives considered

- **Server-side sessions** (sticky sessions or Redis) — would give instant
  revocation and logout-everywhere, but adds a stateful store and ops burden on a
  single small VM, and a lookup on every request. Rejected for that cost.

## Consequences

- Any request authenticates itself with no server lookup — fits the
  poll-heavy/offline clients and the no-extra-infra constraint.
- **Known limitation — no revocation / no reuse-detection.** Refresh is
  *stateless rotation*: a new pair is issued each time, but the **old refresh
  token is not invalidated** and remains valid until it expires. There is no
  token store, no family tracking. Consequences:
  - A stolen refresh token cannot be detected or revoked; it works until expiry.
  - "Logout everywhere" is not possible without waiting out expiry.
  - The rotation provides little security benefit by itself (the server still
    honors the old token).
  - **Mitigation today:** keep access-token lifetime short. **If this gap matters
    later**, add a stored refresh-token id (jti) with a denylist or token-family
    table to enable invalidation + reuse-detection — this would reintroduce a
    small amount of server state.
- Disabling CSRF is safe here because auth is header-based, not cookie-based.
