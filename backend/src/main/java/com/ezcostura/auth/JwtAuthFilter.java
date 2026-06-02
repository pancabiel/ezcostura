package com.ezcostura.auth;

import com.ezcostura.config.TenantContext;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.security.core.context.SecurityContextImpl;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;
import reactor.util.context.Context;

import java.util.List;
import java.util.UUID;

/**
 * Validates the JWT, extracts {@code tenantId} / role / userId, and propagates
 * them via Reactor context so blocking JDBC code can read the tenant via
 * {@link com.ezcostura.config.ReactiveTenantHelper}.
 *
 * Login and refresh endpoints are excluded — they manage tenant routing themselves.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 10)
public class JwtAuthFilter implements WebFilter {

    private static final List<String> PUBLIC_PATHS = List.of(
        "/api/auth/login",
        "/api/auth/refresh",
        "/api/auth/operario/login",
        "/api/auth/operario/refresh"
    );

    private final JwtService jwtService;

    public JwtAuthFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        String path = exchange.getRequest().getURI().getPath();

        if (HttpMethod.OPTIONS.equals(exchange.getRequest().getMethod())) {
            return chain.filter(exchange);
        }
        if (PUBLIC_PATHS.contains(path)) {
            return chain.filter(exchange);
        }
        if (!path.startsWith("/api/")) {
            return chain.filter(exchange);
        }

        String header = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (header == null || !header.startsWith("Bearer ")) {
            return unauthorized(exchange);
        }
        String token = header.substring("Bearer ".length()).trim();

        Claims claims;
        try {
            claims = jwtService.parse(token);
        } catch (JwtException ex) {
            return unauthorized(exchange);
        }
        if (!"access".equals(claims.get("type", String.class))) {
            return unauthorized(exchange);
        }

        UUID userId = UUID.fromString(claims.getSubject());
        String tenantId = claims.get("tenantId", String.class);
        Role role = Role.valueOf(claims.get("role", String.class));
        AuthenticatedPrincipal principal = new AuthenticatedPrincipal(userId, tenantId, role);

        Authentication auth = new UsernamePasswordAuthenticationToken(
            principal,
            token,
            List.of(new SimpleGrantedAuthority("ROLE_" + role.name()))
        );

        return chain.filter(exchange)
            .contextWrite(Context.of(TenantContext.CONTEXT_KEY, tenantId))
            .contextWrite(ReactiveSecurityContextHolder.withSecurityContext(
                Mono.just(new SecurityContextImpl(auth))
            ));
    }

    private Mono<Void> unauthorized(ServerWebExchange exchange) {
        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
        return exchange.getResponse().setComplete();
    }
}
