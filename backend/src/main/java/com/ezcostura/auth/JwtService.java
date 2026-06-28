package com.ezcostura.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {

    private static final int MIN_SECRET_BYTES = 32;

    private final SecretKey key;
    private final long accessTtlSeconds;
    private final long refreshTtlSeconds;
    // O portal do operário usa CPF (chutável) — TTLs mais curtos limitam a janela
    // de um token roubado/abusado sem afetar a sessão do admin.
    private final long operarioAccessTtlSeconds;
    private final long operarioRefreshTtlSeconds;

    public JwtService(
        @Value("${ezcostura.jwt.secret:}") String secret,
        @Value("${ezcostura.jwt.access-ttl-seconds:3600}") long accessTtl,
        @Value("${ezcostura.jwt.refresh-ttl-seconds:1209600}") long refreshTtl,
        @Value("${ezcostura.jwt.operario.access-ttl-seconds:1800}") long operarioAccessTtl,
        @Value("${ezcostura.jwt.operario.refresh-ttl-seconds:604800}") long operarioRefreshTtl
    ) {
        this.key = Keys.hmacShaKeyFor(requireStrongSecret(secret));
        this.accessTtlSeconds = accessTtl;
        this.refreshTtlSeconds = refreshTtl;
        this.operarioAccessTtlSeconds = operarioAccessTtl;
        this.operarioRefreshTtlSeconds = operarioRefreshTtl;
    }

    public String issueAccess(UUID userId, String tenantId, Role role) {
        long ttl = role == Role.OPERARIO_SELF ? operarioAccessTtlSeconds : accessTtlSeconds;
        return issue(userId, tenantId, role, ttl, "access");
    }

    public String issueRefresh(UUID userId, String tenantId, Role role) {
        long ttl = role == Role.OPERARIO_SELF ? operarioRefreshTtlSeconds : refreshTtlSeconds;
        return issue(userId, tenantId, role, ttl, "refresh");
    }

    public Claims parse(String token) {
        return Jwts.parser()
            .verifyWith(key)
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }

    private String issue(UUID userId, String tenantId, Role role, long ttl, String type) {
        Instant now = Instant.now();
        return Jwts.builder()
            .subject(userId.toString())
            .claim("tenantId", tenantId)
            .claim("role", role.name())
            .claim("type", type)
            .issuedAt(Date.from(now))
            .expiration(Date.from(now.plusSeconds(ttl)))
            .signWith(key)
            .compact();
    }

    private static byte[] requireStrongSecret(String secret) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException(
                "ezcostura.jwt.secret is not set. Set the JWT_SECRET env var to a random " +
                "string of at least " + MIN_SECRET_BYTES + " bytes (e.g. `openssl rand -base64 48`).");
        }
        byte[] raw = secret.getBytes(StandardCharsets.UTF_8);
        if (raw.length < MIN_SECRET_BYTES) {
            throw new IllegalStateException(
                "ezcostura.jwt.secret is too short (" + raw.length + " bytes). " +
                "Provide at least " + MIN_SECRET_BYTES + " bytes of entropy.");
        }
        return raw;
    }
}
